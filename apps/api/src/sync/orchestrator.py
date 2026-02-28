import asyncio
import json
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any
from collections.abc import AsyncIterator

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.models.ai_change import AIChange
from src.models.ai_draft import AIDraft
from src.models.ai_event import AIEvent
from src.models.ai_message import AIMessage
from src.models.ai_question import AIQuestion
from src.models.ai_run import AIRun
from src.models.ai_tool_call import AIToolCall
from src.models.ai_usage_event import AIUsageEvent
from src.models.agent_profile import AgentProfile
from src.models.event import Event
from src.models.item import Item
from src.models.workspace import WorkspaceMember
from src.schemas.sync import (
    SyncApplyOut,
    SyncDonePayload,
    SyncEventEnvelope,
    SyncQueuePayload,
    SyncReasoningPayload,
    SyncRunOut,
    SyncSourcesPayload,
    SyncTaskPayload,
    SyncUndoOut,
)
from src.services.maps_provider import estimate_travel_minutes
from src.sync.litellm_client import LiteLLMClient, LiteLLMClientError
from src.sync.prompt_composer import PromptComposer, PromptComposerInput
from src.sync.retrieval import RetrievalService
from src.sync.sync_mutation_engine import (
    SyncMutationEngine,
    SyncMutationNotFoundError,
    SyncMutationValidationError,
)
from src.sync.tool_executor import ToolExecutor
from src.sync.tool_policy import ToolPolicyEngine
from src.sync.tool_registry import get_default_tools


class SyncNotFoundError(Exception):
    pass


class SyncValidationError(Exception):
    pass


class SyncOrchestrator:
    def __init__(
        self,
        *,
        db: AsyncSession,
        workspace_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> None:
        self.db = db
        self.workspace_id = workspace_id
        self.user_id = user_id

    async def create_run(
        self,
        *,
        mode: str,
        model: str | None,
        agent_id: uuid.UUID | None,
        title: str | None,
        context_json: dict,
    ) -> AIRun:
        run = AIRun(
            workspace_id=self.workspace_id,
            created_by_user_id=self.user_id,
            mode=mode,
            status="pending",
            selected_model=model,
            agent_id=agent_id,
            title=title,
            context_json=context_json,
            prompt_version="v3",
            prompt_mode="full",
            system_prompt_snapshot=None,
            toolset_snapshot=[],
            retrieval_snapshot=[],
        )
        self.db.add(run)
        await self.db.commit()
        await self.db.refresh(run)
        return run

    async def get_run_or_raise(self, run_id: uuid.UUID) -> AIRun:
        result = await self.db.execute(
            select(AIRun).where(
                AIRun.id == run_id,
                AIRun.workspace_id == self.workspace_id,
                AIRun.deleted_at.is_(None),
            )
        )
        run = result.scalar_one_or_none()
        if run is None:
            raise SyncNotFoundError("Run not found")
        return run

    async def replay_events(self, run: AIRun, from_seq: int) -> list[SyncEventEnvelope]:
        result = await self.db.execute(
            select(AIEvent)
            .where(
                AIEvent.run_id == run.id,
                AIEvent.seq > from_seq,
                AIEvent.deleted_at.is_(None),
            )
            .order_by(AIEvent.seq.asc())
        )
        rows = list(result.scalars().all())
        return [
            SyncEventEnvelope(
                seq=row.seq,
                run_id=run.id,
                ts=row.created_at,
                trace_id=None,
                type=row.type,  # type: ignore[arg-type]
                payload=row.payload_json,
            )
            for row in rows
        ]

    async def stream_run(
        self,
        *,
        run: AIRun,
        message: str,
        from_seq: int | None = None,
    ) -> list[SyncEventEnvelope]:
        events: list[SyncEventEnvelope] = []
        async for event in self.stream_run_iter(run=run, message=message, from_seq=from_seq):
            events.append(event)
        return events

    async def stream_run_iter(
        self,
        *,
        run: AIRun,
        message: str,
        from_seq: int | None = None,
    ) -> AsyncIterator[SyncEventEnvelope]:
        if from_seq is not None:
            replayed = await self.replay_events(run, from_seq)
            for replay_event in replayed:
                yield replay_event

        clean_message = message.strip()
        if not clean_message:
            return

        try:
            run.status = "streaming"

            user_message = await self._create_message(
                run=run,
                role="user",
                content_json={"text": clean_message},
            )
            yield await self._record_message_event(run=run, message=user_message)

            snippets = await RetrievalService.search(
                self.db,
                workspace_id=self.workspace_id,
                query=clean_message,
                limit=5,
            )
            retrieval_sources = self._normalize_source_items(snippets)
            if retrieval_sources:
                yield await self._record_plain_event(
                    run=run,
                    type_="sources",
                    payload=SyncSourcesPayload(items=retrieval_sources).model_dump(mode="json"),
                )

            agent_profile = await self._get_agent_profile(run.agent_id)
            agent_policy = agent_profile.tool_policy_json if agent_profile else {}
            prompt_mode = agent_profile.prompt_mode if agent_profile else "full"
            prompt_instructions = agent_profile.prompt_instructions if agent_profile else None

            tools = ToolPolicyEngine.resolve_toolset(
                available_tools=get_default_tools(),
                agent_policy=agent_policy,
                runtime_allowlist=None,
            )
            tool_by_name = {tool["name"]: tool for tool in tools}
            allowed_tool_names = set(tool_by_name.keys())
            llm_tools = [
                schema
                for schema in ToolExecutor.llm_tool_schemas()
                if schema.get("function", {}).get("name") in allowed_tool_names
            ]

            raw_workspace_notes = run.context_json.get("workspace_notes")
            workspace_notes = (
                [str(note).strip() for note in raw_workspace_notes if str(note).strip()]
                if isinstance(raw_workspace_notes, list)
                else None
            )
            prefetch_notes = await self._prefetch_planning_context(clean_message)
            if prefetch_notes:
                workspace_notes = (workspace_notes or []) + prefetch_notes
            extra_system_prompt_raw = run.context_json.get("extra_system_prompt")
            extra_system_prompt = (
                str(extra_system_prompt_raw).strip()
                if isinstance(extra_system_prompt_raw, str)
                else None
            )
            user_timezone_raw = run.context_json.get("user_timezone")
            user_timezone = (
                str(user_timezone_raw).strip() if isinstance(user_timezone_raw, str) else None
            )
            locale_raw = run.context_json.get("locale")
            locale = str(locale_raw).strip() if isinstance(locale_raw, str) and locale_raw.strip() else "fr-FR"
            if not user_timezone:
                user_timezone = "Europe/Paris" if locale.lower().startswith("fr") else "UTC"

            system_prompt, retrieval_snapshot, tool_snapshot = PromptComposer.compose(
                PromptComposerInput(
                    agent_name=agent_profile.name if agent_profile else "Sync",
                    prompt_mode=prompt_mode,
                    user_message=clean_message,
                    retrieval_snippets=snippets,
                    allowed_tools=tools,
                    extra_system_prompt=extra_system_prompt,
                    workspace_notes=workspace_notes,
                    user_timezone=user_timezone,
                    user_now=datetime.now(UTC),
                    locale=locale,
                    runtime_info={
                        "agent": str(agent_profile.id) if agent_profile else None,
                        "mode": run.mode,
                        "status": run.status,
                        "model": run.selected_model,
                    },
                )
            )
            if prompt_instructions:
                system_prompt = f"{system_prompt}\nExtra instructions: {prompt_instructions}"

            run.prompt_version = "v3"
            run.prompt_mode = prompt_mode
            run.system_prompt_snapshot = system_prompt
            run.toolset_snapshot = tool_snapshot
            run.retrieval_snapshot = retrieval_snapshot

            llm_messages = await self._build_llm_messages(run=run, system_prompt=system_prompt)
            preview_emitted = False
            final_output: dict[str, Any] | None = None

            max_tool_loops = max(1, int(settings.SYNC_MAX_TOOL_LOOPS))
            tool_loop_count = 0

            while tool_loop_count <= max_tool_loops:
                llm_output = await LiteLLMClient.complete(
                    prompt=system_prompt,
                    user_message=clean_message,
                    model=run.selected_model,
                    messages=llm_messages,
                    tools=llm_tools if llm_tools else None,
                )

                warning_message = llm_output.get("warning")
                if isinstance(warning_message, str) and warning_message.strip():
                    yield await self._record_plain_event(
                        run=run,
                        type_="warning",
                        payload={
                            "code": "llm_fallback",
                            "message": warning_message.strip(),
                        },
                    )

                reasoning_payload = self._normalize_reasoning_payload(llm_output.get("reasoning"))
                if reasoning_payload is not None:
                    yield await self._record_plain_event(
                        run=run,
                        type_="reasoning",
                        payload=reasoning_payload.model_dump(mode="json"),
                    )

                model_sources = self._normalize_source_items(llm_output.get("sources"))
                if model_sources:
                    yield await self._record_plain_event(
                        run=run,
                        type_="sources",
                        payload=SyncSourcesPayload(items=model_sources).model_dump(mode="json"),
                    )

                usage_payload = llm_output.get("usage")
                if isinstance(usage_payload, dict):
                    usage_event = await self._create_usage_event(
                        run=run,
                        provider=str(llm_output.get("provider") or "unknown"),
                        model=str(llm_output.get("model") or run.selected_model or "unknown"),
                        usage=usage_payload,
                    )
                    yield await self._record_usage_event(run=run, usage=usage_event)

                raw_tool_calls = llm_output.get("tool_calls")
                tool_calls = raw_tool_calls if isinstance(raw_tool_calls, list) else []

                if tool_calls and not llm_tools:
                    yield await self._record_plain_event(
                        run=run,
                        type_="warning",
                        payload={
                            "code": "tool_calls_disabled",
                            "message": "Model requested tool calls but no tools are enabled for this run.",
                        },
                    )
                    final_output = llm_output
                    break

                if tool_calls and tool_loop_count < max_tool_loops:
                    normalized_tool_calls: list[dict[str, Any]] = []
                    for tool_call in tool_calls:
                        if not isinstance(tool_call, dict):
                            continue
                        tool_name = str(tool_call.get("name") or "").strip()
                        if not tool_name:
                            continue
                        tool_arguments = (
                            tool_call.get("arguments")
                            if isinstance(tool_call.get("arguments"), dict)
                            else {}
                        )
                        normalized_tool_calls.append(
                            {
                                "id": str(tool_call.get("id") or uuid.uuid4()),
                                "name": tool_name,
                                "arguments": tool_arguments,
                            }
                        )

                    if not normalized_tool_calls:
                        final_output = llm_output
                        break

                    llm_messages.append(
                        {
                            "role": "assistant",
                            "content": str(llm_output.get("content") or ""),
                            "tool_calls": [
                                {
                                    "id": tool_call["id"],
                                    "type": "function",
                                    "function": {
                                        "name": tool_call["name"],
                                        "arguments": json.dumps(
                                            tool_call["arguments"],
                                            ensure_ascii=True,
                                        ),
                                    },
                                }
                                for tool_call in normalized_tool_calls
                            ],
                        }
                    )

                    for tool_call_payload in normalized_tool_calls:
                        tool_name = tool_call_payload["name"]

                        if tool_name not in allowed_tool_names:
                            yield await self._record_plain_event(
                                run=run,
                                type_="warning",
                                payload={
                                    "code": "tool_denied",
                                    "message": f"Tool '{tool_name}' is not allowed by policy.",
                                },
                            )
                            llm_messages.append(
                                {
                                    "role": "tool",
                                    "tool_call_id": tool_call_payload["id"],
                                    "name": tool_name,
                                    "content": json.dumps(
                                        {"error": f"Tool '{tool_name}' denied by policy."},
                                        ensure_ascii=True,
                                    ),
                                }
                            )
                            continue

                        tool_args = (
                            tool_call_payload.get("arguments")
                            if isinstance(tool_call_payload.get("arguments"), dict)
                            else {}
                        )
                        tool_call = await self._create_tool_call(
                            run=run,
                            tool_name=tool_name,
                            args_json=tool_args,
                            requires_confirmation=bool(tool_by_name[tool_name]["requires_confirm"]),
                        )
                        yield await self._record_tool_call_event(
                            run=run,
                            tool_call=tool_call,
                            status="started",
                        )
                        yield await self._record_plain_event(
                            run=run,
                            type_="task",
                            payload=SyncTaskPayload(
                                task_id=str(tool_call.id),
                                title=f"{tool_name}",
                                status="started",
                                detail="Tool execution started",
                                tool_name=tool_name,
                            ).model_dump(mode="json"),
                        )
                        yield await self._record_plain_event(
                            run=run,
                            type_="queue",
                            payload=SyncQueuePayload(
                                queue_id=str(tool_call.id),
                                label=tool_name,
                                status="running",
                                detail="Running",
                            ).model_dump(mode="json"),
                        )

                        try:
                            execution = await self._execute_tool_call(
                                tool_name=tool_name,
                                args=tool_args,
                                user_message=clean_message,
                            )
                            tool_call.status = "completed"
                            tool_call.result_json = execution
                            yield await self._record_tool_result_event(
                                run=run,
                                tool_call=tool_call,
                                status="completed",
                                summary=str(execution.get("summary") or "Tool call completed"),
                            )
                            yield await self._record_tool_call_status_event(
                                run=run,
                                tool_call=tool_call,
                                status="completed",
                            )
                            yield await self._record_plain_event(
                                run=run,
                                type_="task",
                                payload=SyncTaskPayload(
                                    task_id=str(tool_call.id),
                                    title=f"{tool_name}",
                                    status="completed",
                                    detail=str(execution.get("summary") or "Completed"),
                                    tool_name=tool_name,
                                ).model_dump(mode="json"),
                            )
                            yield await self._record_plain_event(
                                run=run,
                                type_="queue",
                                payload=SyncQueuePayload(
                                    queue_id=str(tool_call.id),
                                    label=tool_name,
                                    status="completed",
                                    detail=str(execution.get("summary") or "Completed"),
                                ).model_dump(mode="json"),
                            )
                        except (SyncValidationError, SyncMutationValidationError) as exc:
                            tool_call.status = "failed"
                            tool_call.error_code = "tool_validation_error"
                            tool_call.result_json = {"error": str(exc)}
                            yield await self._record_tool_result_event(
                                run=run,
                                tool_call=tool_call,
                                status="failed",
                                summary=str(exc),
                            )
                            yield await self._record_tool_call_status_event(
                                run=run,
                                tool_call=tool_call,
                                status="failed",
                            )
                            yield await self._record_plain_event(
                                run=run,
                                type_="task",
                                payload=SyncTaskPayload(
                                    task_id=str(tool_call.id),
                                    title=f"{tool_name}",
                                    status="failed",
                                    detail=str(exc),
                                    tool_name=tool_name,
                                ).model_dump(mode="json"),
                            )
                            yield await self._record_plain_event(
                                run=run,
                                type_="queue",
                                payload=SyncQueuePayload(
                                    queue_id=str(tool_call.id),
                                    label=tool_name,
                                    status="failed",
                                    detail=str(exc),
                                ).model_dump(mode="json"),
                            )
                            execution = {"error": str(exc)}
                        except Exception as exc:  # pragma: no cover - defensive fallback
                            tool_call.status = "failed"
                            tool_call.error_code = "tool_execution_error"
                            tool_call.result_json = {"error": str(exc)}
                            yield await self._record_tool_result_event(
                                run=run,
                                tool_call=tool_call,
                                status="failed",
                                summary="Tool execution failed",
                            )
                            yield await self._record_tool_call_status_event(
                                run=run,
                                tool_call=tool_call,
                                status="failed",
                            )
                            yield await self._record_plain_event(
                                run=run,
                                type_="task",
                                payload=SyncTaskPayload(
                                    task_id=str(tool_call.id),
                                    title=f"{tool_name}",
                                    status="failed",
                                    detail="Tool execution failed",
                                    tool_name=tool_name,
                                ).model_dump(mode="json"),
                            )
                            yield await self._record_plain_event(
                                run=run,
                                type_="queue",
                                payload=SyncQueuePayload(
                                    queue_id=str(tool_call.id),
                                    label=tool_name,
                                    status="failed",
                                    detail="Tool execution failed",
                                ).model_dump(mode="json"),
                            )
                            execution = {"error": str(exc)}

                        preview_candidate = execution.get("preview") if isinstance(execution, dict) else None
                        if isinstance(preview_candidate, dict):
                            entity_type, entity_id, action = self._preview_entity_metadata(preview_candidate)
                            preview = await self._create_draft(
                                run=run,
                                kind="preview",
                                title=str(preview_candidate.get("summary") or "Proposed preview"),
                                body_json=preview_candidate,
                                summary=str(preview_candidate.get("summary") or "Preview generated"),
                                entity_type=entity_type,
                                action=action,
                                expires_at=ToolExecutor.default_preview_expiry(),
                                undoable=True,
                            )
                            if entity_id is not None:
                                preview.entity_id = entity_id
                                await self.db.flush()

                            yield await self._record_preview_event(run=run, preview=preview)
                            preview_emitted = True

                        llm_messages.append(
                            {
                                "role": "tool",
                                "tool_call_id": tool_call_payload["id"],
                                "name": tool_name,
                                "content": json.dumps(execution, ensure_ascii=True, default=str),
                            }
                        )

                    tool_loop_count += 1
                    continue

                if tool_calls and tool_loop_count >= max_tool_loops:
                    yield await self._record_plain_event(
                        run=run,
                        type_="warning",
                        payload={
                            "code": "tool_loop_limit",
                            "message": "Tool loop limit reached before final answer.",
                        },
                    )

                final_output = llm_output
                break

            if final_output is None:
                raise SyncValidationError("Unable to produce a final assistant response")

            assistant_content = str(final_output.get("content") or "").strip()
            if not assistant_content:
                assistant_content = (
                    "Preview generated. Review the proposed changes and apply when ready."
                    if preview_emitted
                    else "Done."
                )

            for chunk in self._chunk_message_tokens(assistant_content):
                yield await self._record_plain_event(
                    run=run,
                    type_="token",
                    payload={"delta": chunk},
                )
                await asyncio.sleep(0.025)

            assistant_message = await self._create_message(
                run=run,
                role="assistant",
                content_json={"text": assistant_content},
                provider=str(final_output.get("provider") or "unknown"),
                model=str(final_output.get("model") or run.selected_model or "unknown"),
                usage_json=final_output.get("usage") if isinstance(final_output.get("usage"), dict) else None,
            )
            yield await self._record_message_event(run=run, message=assistant_message)

            draft = await self._create_draft(
                run=run,
                kind="draft",
                title="Assistant draft",
                body_json={
                    "text": assistant_content,
                    "snippets": retrieval_snapshot,
                    "tools": tool_snapshot,
                },
                summary="Assistant response",
            )
            yield await self._record_draft_event(run=run, draft=draft)

            run.status = "ready_to_apply" if preview_emitted else "done"
            yield await self._record_plain_event(
                run=run,
                type_="done",
                payload=SyncDonePayload(status=run.status).model_dump(mode="json"),
            )
            await self.db.commit()

        except LiteLLMClientError as exc:
            run.status = "failed"
            yield await self._record_plain_event(
                run=run,
                type_="error",
                payload={
                    "code": exc.code,
                    "message": str(exc),
                    "retryable": exc.retryable,
                },
            )
            yield await self._record_plain_event(
                run=run,
                type_="done",
                payload=SyncDonePayload(status=run.status).model_dump(mode="json"),
            )
            await self.db.commit()

        except Exception as exc:  # pragma: no cover - defensive fallback
            run.status = "failed"
            yield await self._record_plain_event(
                run=run,
                type_="error",
                payload={
                    "code": "stream_error",
                    "message": str(exc),
                    "retryable": False,
                },
            )
            yield await self._record_plain_event(
                run=run,
                type_="done",
                payload=SyncDonePayload(status=run.status).model_dump(mode="json"),
            )
            await self.db.commit()

    async def apply_preview(
        self,
        *,
        run: AIRun,
        preview_id: uuid.UUID,
        idempotency_key: str,
    ) -> SyncApplyOut:
        existing = await self.db.execute(
            select(AIChange).where(
                AIChange.workspace_id == self.workspace_id,
                AIChange.run_id == run.id,
                AIChange.reason == f"sync_apply:{idempotency_key}",
                AIChange.deleted_at.is_(None),
            )
        )
        existing_change = existing.scalar_one_or_none()
        if existing_change is not None:
            return SyncApplyOut(
                run_id=run.id,
                preview_id=preview_id,
                change_id=existing_change.id,
                applied_at=existing_change.created_at,
                undoable=existing_change.undoable,
            )

        preview_result = await self.db.execute(
            select(AIDraft).where(
                AIDraft.id == preview_id,
                AIDraft.run_id == run.id,
                AIDraft.kind == "preview",
                AIDraft.deleted_at.is_(None),
            )
        )
        preview = preview_result.scalar_one_or_none()
        if preview is None:
            raise SyncNotFoundError("Preview not found")

        if preview.applied_change_id is not None:
            applied_result = await self.db.execute(
                select(AIChange).where(
                    AIChange.id == preview.applied_change_id,
                    AIChange.workspace_id == self.workspace_id,
                    AIChange.run_id == run.id,
                    AIChange.deleted_at.is_(None),
                )
            )
            applied_change = applied_result.scalar_one_or_none()
            if applied_change is not None:
                return SyncApplyOut(
                    run_id=run.id,
                    preview_id=preview.id,
                    change_id=applied_change.id,
                    applied_at=applied_change.created_at,
                    undoable=applied_change.undoable,
                )

        now = datetime.now(UTC)
        if preview.expires_at is not None and preview.expires_at < now:
            raise SyncValidationError("Preview expired")

        if not isinstance(preview.body_json, dict):
            raise SyncValidationError("Invalid preview payload")

        engine = SyncMutationEngine(
            db=self.db,
            workspace_id=self.workspace_id,
            user_id=self.user_id,
        )
        try:
            apply_result = await engine.apply_preview_payload(preview.body_json)
        except SyncMutationValidationError as exc:
            raise SyncValidationError(str(exc)) from exc
        except SyncMutationNotFoundError as exc:
            raise SyncNotFoundError(str(exc)) from exc

        change = AIChange(
            workspace_id=self.workspace_id,
            actor_user_id=self.user_id,
            run_id=run.id,
            entity_type=apply_result.entity_type,
            entity_id=apply_result.entity_id,
            action=apply_result.action,
            reason=f"sync_apply:{idempotency_key}",
            before_payload=apply_result.before_payload,
            after_payload=apply_result.after_payload,
            undoable=apply_result.undoable and preview.undoable,
        )
        self.db.add(change)
        await self.db.flush()

        preview.applied_change_id = change.id
        run.status = "applied"

        applied_payload = {
            "run_id": str(run.id),
            "preview_id": str(preview.id),
            "change_id": str(change.id),
            "applied_at": now.isoformat(),
            "undoable": change.undoable,
        }
        await self._record_plain_event(run=run, type_="applied", payload=applied_payload)
        await self._record_plain_event(
            run=run,
            type_="done",
            payload=SyncDonePayload(status=run.status).model_dump(mode="json"),
        )

        await self.db.commit()
        return SyncApplyOut(
            run_id=run.id,
            preview_id=preview.id,
            change_id=change.id,
            applied_at=now,
            undoable=change.undoable,
        )

    async def undo_change(
        self,
        *,
        run: AIRun,
        change_id: uuid.UUID,
        idempotency_key: str | None,
    ) -> SyncUndoOut:
        result = await self.db.execute(
            select(AIChange).where(
                AIChange.id == change_id,
                AIChange.workspace_id == self.workspace_id,
                AIChange.run_id == run.id,
                AIChange.deleted_at.is_(None),
            )
        )
        change = result.scalar_one_or_none()
        if change is None:
            raise SyncNotFoundError("Change not found")
        if not change.undoable:
            raise SyncValidationError("Change is not undoable")

        reason = f"sync_undo:{change_id}:{idempotency_key or 'auto'}"
        existing = await self.db.execute(
            select(AIChange).where(
                AIChange.workspace_id == self.workspace_id,
                AIChange.run_id == run.id,
                AIChange.reason == reason,
                AIChange.deleted_at.is_(None),
            )
        )
        existing_undo = existing.scalar_one_or_none()
        if existing_undo is not None:
            return SyncUndoOut(
                run_id=run.id,
                change_id=change.id,
                undone=True,
                undone_at=existing_undo.created_at,
            )

        engine = SyncMutationEngine(
            db=self.db,
            workspace_id=self.workspace_id,
            user_id=self.user_id,
        )
        try:
            undo_result = await engine.undo_change(change)
        except SyncMutationValidationError as exc:
            raise SyncValidationError(str(exc)) from exc
        except SyncMutationNotFoundError as exc:
            raise SyncNotFoundError(str(exc)) from exc

        now = datetime.now(UTC)
        undo_change = AIChange(
            workspace_id=self.workspace_id,
            actor_user_id=self.user_id,
            run_id=run.id,
            entity_type=undo_result.entity_type,
            entity_id=undo_result.entity_id,
            action=undo_result.action,
            reason=reason,
            before_payload=undo_result.before_payload,
            after_payload=undo_result.after_payload,
            undoable=undo_result.undoable,
        )
        self.db.add(undo_change)
        run.status = "done"
        await self._record_plain_event(
            run=run,
            type_="done",
            payload=SyncDonePayload(status=run.status).model_dump(mode="json"),
        )
        await self.db.commit()

        return SyncUndoOut(
            run_id=run.id,
            change_id=change.id,
            undone=True,
            undone_at=now,
        )

    async def mark_answer(
        self,
        *,
        run: AIRun,
        answer: str,
        question_id: uuid.UUID | None,
    ) -> AIRun:
        if question_id is not None:
            q_result = await self.db.execute(
                select(AIQuestion).where(
                    AIQuestion.id == question_id,
                    AIQuestion.run_id == run.id,
                    AIQuestion.deleted_at.is_(None),
                )
            )
            question = q_result.scalar_one_or_none()
            if question is None:
                raise SyncNotFoundError("Question not found")
            question.answer_text = answer
            question.answered_at = datetime.now(UTC)

        await self.stream_run(run=run, message=answer)
        return run

    async def _get_agent_profile(self, agent_id: uuid.UUID | None) -> AgentProfile | None:
        if agent_id is None:
            return None
        result = await self.db.execute(
            select(AgentProfile).where(
                AgentProfile.id == agent_id,
                AgentProfile.workspace_id == self.workspace_id,
                AgentProfile.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def _next_seq(self, run: AIRun) -> int:
        run.last_seq += 1
        await self.db.flush()
        return run.last_seq

    async def _record_plain_event(self, *, run: AIRun, type_: str, payload: dict) -> SyncEventEnvelope:
        seq = await self._next_seq(run)
        event_row = AIEvent(run_id=run.id, seq=seq, type=type_, payload_json=payload)
        self.db.add(event_row)
        await self.db.flush()
        return SyncEventEnvelope(
            seq=seq,
            run_id=run.id,
            ts=event_row.created_at,
            trace_id=None,
            type=type_,  # type: ignore[arg-type]
            payload=payload,
        )

    async def _create_message(
        self,
        *,
        run: AIRun,
        role: str,
        content_json: dict,
        provider: str | None = None,
        model: str | None = None,
        usage_json: dict | None = None,
    ) -> AIMessage:
        seq = await self._next_seq(run)
        message = AIMessage(
            run_id=run.id,
            seq=seq,
            role=role,
            content_json=content_json,
            provider=provider,
            model=model,
            usage_json=usage_json,
        )
        self.db.add(message)
        await self.db.flush()
        return message

    async def _record_message_event(self, *, run: AIRun, message: AIMessage) -> SyncEventEnvelope:
        payload = {
            "id": str(message.id),
            "run_id": str(message.run_id),
            "seq": message.seq,
            "role": message.role,
            "content_json": message.content_json,
            "provider": message.provider,
            "model": message.model,
            "usage_json": message.usage_json,
            "error_code": message.error_code,
            "created_at": message.created_at.isoformat(),
        }
        event = AIEvent(run_id=run.id, seq=message.seq, type="message", payload_json=payload)
        self.db.add(event)
        await self.db.flush()
        return SyncEventEnvelope(
            seq=message.seq,
            run_id=run.id,
            ts=message.created_at,
            trace_id=None,
            type="message",
            payload=payload,
        )

    async def _create_usage_event(self, *, run: AIRun, provider: str, model: str, usage: dict) -> AIUsageEvent:
        seq = await self._next_seq(run)
        row = AIUsageEvent(
            run_id=run.id,
            seq=seq,
            provider=provider,
            model=model,
            input_tokens=int(usage.get("input_tokens", 0)),
            output_tokens=int(usage.get("output_tokens", 0)),
            total_tokens=int(usage.get("total_tokens", 0)),
            cost_usd=usage.get("cost_usd"),
        )
        self.db.add(row)
        await self.db.flush()
        return row

    async def _record_usage_event(self, *, run: AIRun, usage: AIUsageEvent) -> SyncEventEnvelope:
        payload = {
            "provider": usage.provider,
            "model": usage.model,
            "usage": {
                "input_tokens": usage.input_tokens,
                "output_tokens": usage.output_tokens,
                "total_tokens": usage.total_tokens,
                "cost_usd": float(usage.cost_usd) if usage.cost_usd is not None else None,
            },
        }
        event = AIEvent(run_id=run.id, seq=usage.seq, type="usage", payload_json=payload)
        self.db.add(event)
        await self.db.flush()
        return SyncEventEnvelope(
            seq=usage.seq,
            run_id=run.id,
            ts=usage.created_at,
            trace_id=None,
            type="usage",
            payload=payload,
        )

    async def _create_draft(
        self,
        *,
        run: AIRun,
        kind: str,
        title: str | None,
        body_json: dict,
        summary: str | None,
        entity_type: str | None = None,
        action: str | None = None,
        expires_at: datetime | None = None,
        undoable: bool = True,
    ) -> AIDraft:
        seq = await self._next_seq(run)
        draft = AIDraft(
            run_id=run.id,
            seq=seq,
            kind=kind,
            title=title,
            body_json=body_json,
            summary=summary,
            entity_type=entity_type,
            action=action,
            expires_at=expires_at,
            undoable=undoable,
        )
        self.db.add(draft)
        await self.db.flush()
        return draft

    async def _record_draft_event(self, *, run: AIRun, draft: AIDraft) -> SyncEventEnvelope:
        payload = {
            "id": str(draft.id),
            "run_id": str(draft.run_id),
            "seq": draft.seq,
            "title": draft.title,
            "body_json": draft.body_json,
            "summary": draft.summary,
            "created_at": draft.created_at.isoformat(),
        }
        event = AIEvent(run_id=run.id, seq=draft.seq, type="draft", payload_json=payload)
        self.db.add(event)
        await self.db.flush()
        return SyncEventEnvelope(
            seq=draft.seq,
            run_id=run.id,
            ts=draft.created_at,
            trace_id=None,
            type="draft",
            payload=payload,
        )

    async def _record_preview_event(self, *, run: AIRun, preview: AIDraft) -> SyncEventEnvelope:
        payload = {
            "id": str(preview.id),
            "run_id": str(preview.run_id),
            "seq": preview.seq,
            "entity_type": preview.entity_type,
            "entity_id": str(preview.entity_id) if preview.entity_id else None,
            "action": preview.action,
            "diff_json": preview.body_json,
            "expires_at": preview.expires_at.isoformat() if preview.expires_at else None,
            "undoable": preview.undoable,
            "created_at": preview.created_at.isoformat(),
        }
        event = AIEvent(run_id=run.id, seq=preview.seq, type="preview", payload_json=payload)
        self.db.add(event)
        await self.db.flush()
        return SyncEventEnvelope(
            seq=preview.seq,
            run_id=run.id,
            ts=preview.created_at,
            trace_id=None,
            type="preview",
            payload=payload,
        )

    async def _create_tool_call(
        self,
        *,
        run: AIRun,
        tool_name: str,
        args_json: dict,
        requires_confirmation: bool,
    ) -> AIToolCall:
        seq = await self._next_seq(run)
        call = AIToolCall(
            run_id=run.id,
            seq=seq,
            tool_name=tool_name,
            args_json=args_json,
            status="started",
            requires_confirmation=requires_confirmation,
        )
        self.db.add(call)
        await self.db.flush()
        return call

    async def _record_tool_call_event(
        self,
        *,
        run: AIRun,
        tool_call: AIToolCall,
        status: str,
    ) -> SyncEventEnvelope:
        payload = {
            "tool_call_id": str(tool_call.id),
            "tool_name": tool_call.tool_name,
            "args_json": tool_call.args_json,
            "requires_confirm": tool_call.requires_confirmation,
            "status": status,
        }
        event = AIEvent(run_id=run.id, seq=tool_call.seq, type="tool_call", payload_json=payload)
        self.db.add(event)
        await self.db.flush()
        return SyncEventEnvelope(
            seq=tool_call.seq,
            run_id=run.id,
            ts=tool_call.created_at,
            trace_id=None,
            type="tool_call",
            payload=payload,
        )

    async def _record_tool_result_event(
        self,
        *,
        run: AIRun,
        tool_call: AIToolCall,
        status: str,
        summary: str,
    ) -> SyncEventEnvelope:
        seq = await self._next_seq(run)
        payload = {
            "tool_call_id": str(tool_call.id),
            "status": status,
            "summary": summary,
            "result_json": tool_call.result_json,
        }
        event = AIEvent(run_id=run.id, seq=seq, type="tool_result", payload_json=payload)
        self.db.add(event)
        await self.db.flush()
        return SyncEventEnvelope(
            seq=seq,
            run_id=run.id,
            ts=event.created_at,
            trace_id=None,
            type="tool_result",
            payload=payload,
        )

    async def _record_tool_call_status_event(
        self,
        *,
        run: AIRun,
        tool_call: AIToolCall,
        status: str,
    ) -> SyncEventEnvelope:
        payload = {
            "tool_call_id": str(tool_call.id),
            "tool_name": tool_call.tool_name,
            "args_json": tool_call.args_json,
            "requires_confirm": tool_call.requires_confirmation,
            "status": status,
        }
        return await self._record_plain_event(run=run, type_="tool_call", payload=payload)

    async def _build_llm_messages(self, *, run: AIRun, system_prompt: str) -> list[dict[str, Any]]:
        result = await self.db.execute(
            select(AIMessage)
            .where(
                AIMessage.run_id == run.id,
                AIMessage.deleted_at.is_(None),
            )
            .order_by(AIMessage.seq.asc())
            .limit(80)
        )
        rows = list(result.scalars().all())
        messages: list[dict[str, Any]] = [{"role": "system", "content": system_prompt}]
        for row in rows:
            role = row.role if row.role in {"system", "user", "assistant", "tool"} else "user"
            content = self._extract_message_text(row.content_json)
            messages.append({"role": role, "content": content})
        return messages

    async def _execute_tool_call(
        self,
        *,
        tool_name: str,
        args: dict[str, Any],
        user_message: str,
    ) -> dict[str, Any]:
        if tool_name == "calendar.events.range":
            from_at = self._parse_optional_datetime(args.get("from_at"))
            to_at = self._parse_optional_datetime(args.get("to_at"))
            if from_at is None or to_at is None:
                raise SyncValidationError("calendar.events.range requires from_at and to_at")
            if to_at < from_at:
                raise SyncValidationError("calendar.events.range requires to_at >= from_at")

            limit_raw = args.get("limit")
            limit = int(limit_raw) if isinstance(limit_raw, int) else 60
            limit = max(1, min(limit, 200))
            events = await self._calendar_events_range(from_at=from_at, to_at=to_at, limit=limit)
            return {
                "summary": f"{len(events)} event(s) found in range",
                "result_json": {"events": events, "from_at": from_at.isoformat(), "to_at": to_at.isoformat()},
            }

        if tool_name == "calendar.preferences.get":
            preferences = await self._calendar_preferences_get()
            return {
                "summary": "Calendar preferences loaded",
                "result_json": preferences,
            }

        if tool_name == "calendar.patterns.suggest":
            title = str(args.get("title") or "").strip() or user_message.strip()
            if not title:
                raise SyncValidationError("calendar.patterns.suggest requires title")
            suggestion = await self._calendar_patterns_suggest(title=title)
            return {
                "summary": "Pattern suggestion ready",
                "result_json": suggestion,
            }

        if tool_name == "travel.estimate":
            destination = str(args.get("destination") or "").strip()
            if not destination:
                raise SyncValidationError("travel.estimate requires destination")
            origin = str(args.get("origin") or "").strip() or None
            mode = str(args.get("mode") or "").strip() or None
            estimate = estimate_travel_minutes(destination=destination, origin=origin, preferred_mode=mode)
            return {
                "summary": f"Estimated travel: {estimate.get('estimated_duration_minutes', 0)} min",
                "result_json": estimate,
            }

        if tool_name == "memory.search":
            query = str(args.get("query") or user_message).strip()
            if not query:
                raise SyncValidationError("memory.search requires a non-empty query")
            limit_raw = args.get("limit")
            limit = int(limit_raw) if isinstance(limit_raw, int) else 5
            limit = max(1, min(limit, 10))
            snippets = await RetrievalService.search(
                self.db,
                workspace_id=self.workspace_id,
                query=query,
                limit=limit,
            )
            return {
                "summary": f"{len(snippets)} snippet(s) found",
                "result_json": {"snippets": snippets},
            }

        if tool_name == "item.preview":
            preview = ToolExecutor.build_item_preview(args, user_message)
            return {
                "summary": str(preview.get("summary") or "Preview generated"),
                "result_json": preview,
                "preview": preview,
            }

        if tool_name == "event.preview":
            preview = ToolExecutor.build_event_preview(args, user_message)
            return {
                "summary": str(preview.get("summary") or "Preview generated"),
                "result_json": preview,
                "preview": preview,
            }

        if tool_name == "inbox.transform.preview":
            preview = ToolExecutor.build_inbox_transform_preview(args, user_message)
            return {
                "summary": str(preview.get("summary") or "Preview generated"),
                "result_json": preview,
                "preview": preview,
            }

        raise SyncValidationError(f"Unsupported tool '{tool_name}'")

    async def _calendar_events_range(
        self,
        *,
        from_at: datetime,
        to_at: datetime,
        limit: int,
    ) -> list[dict[str, Any]]:
        result = await self.db.execute(
            select(Event, Item)
            .join(Item, Item.id == Event.item_id)
            .where(
                Event.workspace_id == self.workspace_id,
                Event.deleted_at.is_(None),
                Item.deleted_at.is_(None),
                Event.end_at >= from_at,
                Event.start_at <= to_at,
            )
            .order_by(Event.start_at.asc())
            .limit(limit)
        )
        rows = result.all()
        events: list[dict[str, Any]] = []
        for event, item in rows:
            title = item.title if item and isinstance(item.title, str) else ""
            events.append(
                {
                    "event_id": str(event.id),
                    "item_id": str(event.item_id),
                    "title": title,
                    "start_at": event.start_at.isoformat(),
                    "end_at": event.end_at.isoformat(),
                    "estimated_time_seconds": event.estimated_time_seconds,
                    "color": event.color,
                }
            )
        return events

    async def _calendar_preferences_get(self) -> dict[str, Any]:
        result = await self.db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == self.workspace_id,
                WorkspaceMember.user_id == self.user_id,
                WorkspaceMember.deleted_at.is_(None),
            )
        )
        membership = result.scalar_one_or_none()

        start_hour = 8
        end_hour = 24
        if membership and isinstance(membership.preferences, dict):
            calendar = membership.preferences.get("calendar")
            if isinstance(calendar, dict):
                raw_start = calendar.get("start_hour")
                raw_end = calendar.get("end_hour")
                if isinstance(raw_start, int) and 0 <= raw_start <= 23:
                    start_hour = raw_start
                if isinstance(raw_end, int) and 1 <= raw_end <= 24:
                    end_hour = raw_end
        if end_hour <= start_hour:
            start_hour = 8
            end_hour = 24

        return {"start_hour": start_hour, "end_hour": end_hour}

    async def _calendar_patterns_suggest(self, *, title: str) -> dict[str, Any]:
        lowered_tokens = [token for token in title.lower().split() if len(token) >= 3]
        if not lowered_tokens:
            return {
                "title": title,
                "suggested_duration_seconds": 3600,
                "suggested_color": "sky",
                "sample_size": 0,
            }

        result = await self.db.execute(
            select(Event, Item)
            .join(Item, Item.id == Event.item_id)
            .where(
                Event.workspace_id == self.workspace_id,
                Event.deleted_at.is_(None),
                Item.deleted_at.is_(None),
            )
            .order_by(Event.start_at.desc())
            .limit(150)
        )
        rows = result.all()

        durations: list[int] = []
        color_counts: dict[str, int] = {}
        for event, item in rows:
            title_value = (item.title or "").lower() if item else ""
            if not any(token in title_value for token in lowered_tokens):
                continue
            duration = int(event.estimated_time_seconds or 0)
            if duration <= 0:
                duration = max(0, int((event.end_at - event.start_at).total_seconds()))
            if duration > 0:
                durations.append(duration)
            color = str(event.color or "sky").strip().lower()
            color_counts[color] = color_counts.get(color, 0) + 1

        if not durations:
            return {
                "title": title,
                "suggested_duration_seconds": 3600,
                "suggested_color": "sky",
                "sample_size": 0,
            }

        avg_duration = int(sum(durations) / len(durations))
        avg_duration = max(900, min(avg_duration, 6 * 3600))
        sorted_colors = sorted(color_counts.items(), key=lambda entry: entry[1], reverse=True)
        suggested_color = sorted_colors[0][0] if sorted_colors else "sky"

        return {
            "title": title,
            "suggested_duration_seconds": avg_duration,
            "suggested_color": suggested_color,
            "sample_size": len(durations),
        }

    @staticmethod
    def _parse_optional_datetime(value: Any) -> datetime | None:
        if value is None:
            return None
        if isinstance(value, datetime):
            parsed = value if value.tzinfo else value.replace(tzinfo=UTC)
            return parsed.astimezone(UTC)
        if isinstance(value, str) and value.strip():
            raw = value.strip().replace("Z", "+00:00")
            try:
                parsed = datetime.fromisoformat(raw)
            except ValueError:
                return None
            parsed = parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)
            return parsed.astimezone(UTC)
        return None

    async def _prefetch_planning_context(self, user_message: str) -> list[str]:
        if not self._is_scheduling_intent(user_message):
            return []

        notes: list[str] = []
        now = datetime.now(UTC)

        try:
            preferences = await self._calendar_preferences_get()
            notes.append(
                "Calendar preferences: "
                f"start_hour={preferences.get('start_hour', 8)}, end_hour={preferences.get('end_hour', 24)}."
            )
        except Exception:
            pass

        try:
            events = await self._calendar_events_range(
                from_at=now - timedelta(hours=2),
                to_at=now + timedelta(days=3),
                limit=20,
            )
            notes.append(f"Nearby schedule context: {len(events)} event(s) in the next 3 days.")
        except Exception:
            pass

        try:
            pattern = await self._calendar_patterns_suggest(title=user_message)
            notes.append(
                "Pattern defaults: "
                f"duration={pattern.get('suggested_duration_seconds', 3600)}s, "
                f"color={pattern.get('suggested_color', 'sky')}."
            )
        except Exception:
            pass

        return notes

    @staticmethod
    def _is_scheduling_intent(message: str) -> bool:
        lowered = message.lower()
        scheduling_tokens = (
            "event",
            "calendar",
            "plan",
            "schedule",
            "meeting",
            "rendez",
            "ce soir",
            "demain",
            "today",
            "tonight",
            "revue",
            "sport",
            "salle",
        )
        return any(token in lowered for token in scheduling_tokens)

    @staticmethod
    def _extract_message_text(content_json: dict[str, Any] | None) -> str:
        if not isinstance(content_json, dict):
            return ""
        text = content_json.get("text")
        if isinstance(text, str):
            return text
        content = content_json.get("content")
        if isinstance(content, str):
            return content
        try:
            return json.dumps(content_json, ensure_ascii=True)
        except TypeError:
            return ""

    @classmethod
    def _preview_entity_metadata(
        cls,
        preview_payload: dict[str, Any],
    ) -> tuple[str, uuid.UUID | None, str]:
        raw_mutations = (
            preview_payload.get("mutations")
            if isinstance(preview_payload.get("mutations"), list)
            else None
        )
        if raw_mutations:
            first = raw_mutations[0] if isinstance(raw_mutations[0], dict) else {}
            mutation = first
        else:
            mutation = (
                preview_payload.get("mutation")
                if isinstance(preview_payload.get("mutation"), dict)
                else {}
            )

        kind = str(mutation.get("kind") or "item.create")
        args = mutation.get("args") if isinstance(mutation.get("args"), dict) else {}

        if kind.startswith("item."):
            return "item", cls._parse_optional_uuid(args.get("item_id")), kind
        if kind.startswith("event."):
            return "event", cls._parse_optional_uuid(args.get("event_id")), kind
        if kind == "inbox.transform":
            return "capture", cls._parse_optional_uuid(args.get("capture_id")), kind
        return "item", None, kind

    @staticmethod
    def _parse_optional_uuid(value: Any) -> uuid.UUID | None:
        if isinstance(value, uuid.UUID):
            return value
        if isinstance(value, str) and value.strip():
            try:
                return uuid.UUID(value)
            except ValueError:
                return None
        return None

    @staticmethod
    def _normalize_reasoning_payload(raw_reasoning: Any) -> SyncReasoningPayload | None:
        if not isinstance(raw_reasoning, dict):
            return None
        summary = raw_reasoning.get("summary")
        content = raw_reasoning.get("content")
        duration_ms = raw_reasoning.get("duration_ms")

        if not isinstance(summary, str):
            summary = None
        if not isinstance(content, str):
            content = None
        if not isinstance(duration_ms, int) or duration_ms < 0:
            duration_ms = None

        if not summary and not content:
            return None
        return SyncReasoningPayload(summary=summary, content=content, duration_ms=duration_ms)

    @staticmethod
    def _normalize_source_items(raw_sources: Any) -> list[dict[str, str | None]]:
        if not isinstance(raw_sources, list):
            return []

        normalized: list[dict[str, str | None]] = []
        for index, source in enumerate(raw_sources):
            if not isinstance(source, dict):
                continue

            source_id = str(source.get("id") or source.get("chunk_id") or f"source-{index + 1}")
            title = source.get("title") or source.get("name")
            if not isinstance(title, str) or not title.strip():
                metadata = source.get("metadata")
                if isinstance(metadata, dict):
                    metadata_title = metadata.get("title") or metadata.get("source")
                    if isinstance(metadata_title, str) and metadata_title.strip():
                        title = metadata_title
            if not isinstance(title, str) or not title.strip():
                title = source_id

            url = source.get("url")
            if not isinstance(url, str) or not url.strip():
                metadata = source.get("metadata")
                if isinstance(metadata, dict):
                    metadata_url = metadata.get("url")
                    if isinstance(metadata_url, str) and metadata_url.strip():
                        url = metadata_url
            if not isinstance(url, str) or not url.strip():
                doc_id = str(source.get("doc_id") or source_id)
                url = f"https://memory.local/{doc_id}"

            snippet = source.get("snippet")
            if not isinstance(snippet, str):
                chunk_text = source.get("chunk_text")
                snippet = chunk_text if isinstance(chunk_text, str) else None

            normalized.append(
                {
                    "id": source_id,
                    "title": title.strip(),
                    "url": url.strip(),
                    "snippet": snippet.strip() if isinstance(snippet, str) and snippet.strip() else None,
                }
            )

        return normalized

    @staticmethod
    def _chunk_message_tokens(text: str, chunk_size: int = 14) -> list[str]:
        if not text:
            return [""]
        if len(text) <= chunk_size:
            return [text]
        return [text[index : index + chunk_size] for index in range(0, len(text), chunk_size)]

    @staticmethod
    def run_to_out(run: AIRun) -> SyncRunOut:
        return SyncRunOut.model_validate(run)

    @staticmethod
    def available_models() -> list[dict]:
        balanced = settings.SYNC_MODEL_BALANCED
        small = settings.SYNC_MODEL_SMALL
        quality = settings.SYNC_MODEL_QUALITY
        configured_provider = (settings.SYNC_LLM_PROVIDER or "mistral").strip().lower()
        provider = (
            configured_provider
            if configured_provider in {"mistral", "openai", "anthropic", "gemini"}
            else "mistral"
        )

        return [
            {
                "id": small,
                "provider": provider,
                "label": "Small",
                "is_default": False,
                "capabilities": {
                    "supports_tools": True,
                    "supports_vision": False,
                    "supports_json_schema": True,
                    "max_context": 128000,
                    "cost_hint": "fast",
                },
            },
            {
                "id": balanced,
                "provider": provider,
                "label": "Balanced",
                "is_default": True,
                "capabilities": {
                    "supports_tools": True,
                    "supports_vision": False,
                    "supports_json_schema": True,
                    "max_context": 128000,
                    "cost_hint": "balanced",
                },
            },
            {
                "id": quality,
                "provider": provider,
                "label": "Quality",
                "is_default": False,
                "capabilities": {
                    "supports_tools": True,
                    "supports_vision": False,
                    "supports_json_schema": True,
                    "max_context": 128000,
                    "cost_hint": "reasoning",
                },
            },
        ]
