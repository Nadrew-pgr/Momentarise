import asyncio
import json
import logging
import re
import uuid
from datetime import UTC, date, datetime, timedelta
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
from src.models.inbox_capture import InboxCapture
from src.models.item import Item
from src.models.workspace import WorkspaceMember
from src.schemas.sync import (
    SyncApplyOut,
    SyncDonePayload,
    SyncEventEnvelope,
    SyncQueuePayload,
    SyncReasoningPayload,
    SyncRunOut,
    SyncQuestionOut,
    SyncSourcesPayload,
    SyncTaskPayload,
    SyncUndonePayload,
    SyncUndoOut,
)
from src.services.maps_provider import estimate_travel_minutes
from src.sync.litellm_client import LiteLLMClient, LiteLLMClientError
from src.sync.prompt_composer import PromptComposer, PromptComposerInput
from src.sync.retrieval import RetrievalService
from src.sync.model_registry import get_available_models as _registry_get_models, resolve_auto_model, get_model_entry
from src.sync.sync_mutation_engine import (
    SyncMutationEngine,
    SyncMutationNotFoundError,
    SyncMutationValidationError,
)
from src.sync.tool_executor import ToolExecutor
from src.sync.tool_policy import ToolPolicyEngine
from src.sync.tool_registry import get_default_tools

logger = logging.getLogger(__name__)


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
        change_ids: set[uuid.UUID] = set()
        source_change_ids: set[uuid.UUID] = set()

        for row in rows:
            payload = row.payload_json if isinstance(row.payload_json, dict) else {}
            if row.type == "applied":
                change_id = self._parse_optional_uuid(payload.get("change_id"))
                if change_id is not None:
                    change_ids.add(change_id)
            elif row.type == "undone":
                source_change_id = self._parse_optional_uuid(
                    payload.get("source_change_id") or payload.get("change_id")
                )
                if source_change_id is not None:
                    source_change_ids.add(source_change_id)
                    change_ids.add(source_change_id)
                undo_change_id = self._parse_optional_uuid(payload.get("undo_change_id"))
                if undo_change_id is not None:
                    change_ids.add(undo_change_id)

        changes_by_id: dict[uuid.UUID, AIChange] = {}
        if change_ids:
            changes_result = await self.db.execute(
                select(AIChange).where(
                    AIChange.workspace_id == self.workspace_id,
                    AIChange.run_id == run.id,
                    AIChange.id.in_(list(change_ids)),
                    AIChange.deleted_at.is_(None),
                )
            )
            changes_by_id = {change.id: change for change in changes_result.scalars().all()}

        undo_by_source_change_id: dict[uuid.UUID, AIChange] = {}
        if source_change_ids:
            undo_changes_result = await self.db.execute(
                select(AIChange).where(
                    AIChange.workspace_id == self.workspace_id,
                    AIChange.run_id == run.id,
                    AIChange.reason.like("sync_undo:%"),
                    AIChange.deleted_at.is_(None),
                )
            )
            for undo_change in undo_changes_result.scalars().all():
                source_change_id = self._parse_source_change_id_from_undo_reason(undo_change.reason)
                if source_change_id is None or source_change_id not in source_change_ids:
                    continue
                previous = undo_by_source_change_id.get(source_change_id)
                if previous is None or previous.created_at < undo_change.created_at:
                    undo_by_source_change_id[source_change_id] = undo_change

        envelopes: list[SyncEventEnvelope] = []
        for row in rows:
            payload = row.payload_json if isinstance(row.payload_json, dict) else {}
            normalized_payload = await self._normalize_replay_event_payload(
                run=run,
                event_type=row.type,
                event_ts=row.created_at,
                payload=payload,
                changes_by_id=changes_by_id,
                undo_by_source_change_id=undo_by_source_change_id,
            )
            envelopes.append(
                SyncEventEnvelope(
                    seq=row.seq,
                    run_id=run.id,
                    ts=row.created_at,
                    trace_id=None,
                    type=row.type,  # type: ignore[arg-type]
                    payload=normalized_payload,
                )
            )

        return envelopes

    async def stream_run(
        self,
        *,
        run: AIRun,
        message: str,
        from_seq: int | None = None,
        attachments: list[Any] | None = None,
        references: list[Any] | None = None,
    ) -> list[SyncEventEnvelope]:
        events: list[SyncEventEnvelope] = []
        async for event in self.stream_run_iter(
            run=run,
            message=message,
            from_seq=from_seq,
            attachments=attachments,
            references=references,
        ):
            events.append(event)
        return events

    async def stream_run_iter(
        self,
        *,
        run: AIRun,
        message: str,
        from_seq: int | None = None,
        attachments: list[Any] | None = None,
        references: list[Any] | None = None,
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

            normalized_attachments = self._normalize_stream_attachments(attachments)
            normalized_references = self._normalize_stream_references(references)
            context_resolution = await self._resolve_sync_context(
                attachments=normalized_attachments,
                references=normalized_references,
            )

            user_content_json: dict[str, Any] = {"text": clean_message}
            if context_resolution["metadata"]:
                user_content_json["metadata"] = {"sync_context": context_resolution["metadata"]}

            user_message = await self._create_message(
                run=run,
                role="user",
                content_json=user_content_json,
            )
            yield await self._record_message_event(run=run, message=user_message)

            for warning in context_resolution["warnings"]:
                yield await self._record_plain_event(
                    run=run,
                    type_="warning",
                    payload={
                        "code": warning.get("code") or "sync_context_warning",
                        "message": warning.get("message") or "Some context could not be resolved.",
                    },
                )

            context_sources = context_resolution["sources"]
            if context_sources:
                yield await self._record_plain_event(
                    run=run,
                    type_="sources",
                    payload=SyncSourcesPayload(items=context_sources).model_dump(mode="json"),
                )

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
            preview_tool_names = {"item_preview", "event_preview", "inbox_transform_preview"}
            preview_tools_enabled = self._is_explicit_mutation_intent(clean_message)
            if not preview_tools_enabled:
                tools = [
                    tool for tool in tools if str(tool.get("name") or "").strip() not in preview_tool_names
                ]
                logger.info(
                    "sync.preview_blocked_non_mutation workspace=%s run=%s",
                    self.workspace_id,
                    run.id,
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
            if context_resolution["workspace_notes"]:
                workspace_notes = (workspace_notes or []) + context_resolution["workspace_notes"]
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
            if run.prompt_instructions:
                system_prompt = f"{system_prompt}\nExtra instructions: {run.prompt_instructions}"

            # Auto-activation/Plan Mode Hint:
            # If in "free" (Normal) mode but with a mutation intent, remind the AI to be cautious.
            # If in "guided" (Plan) mode, the system_prompt already contains the Guided Planning Policy.
            if run.mode == "free" and preview_tools_enabled:
                planning_hint = (
                    "\n\n[SYSTEM HINT: The user is in NORMAL mode but has a mutation intent. "
                    "If the request is complex or lacks critical details, prefer a brief dialogue or a "
                    "one-line plan before emitting previews to ensure accuracy and avoid spam.]"
                )
                system_prompt = f"{system_prompt}{planning_hint}"

            run.prompt_version = "v3"
            run.prompt_mode = prompt_mode
            run.system_prompt_snapshot = system_prompt
            run.toolset_snapshot = tool_snapshot
            run.retrieval_snapshot = retrieval_snapshot

            llm_messages = await self._build_llm_messages(run=run, system_prompt=system_prompt)
            preview_emitted = False
            emitted_preview_payloads: list[dict[str, Any]] = []
            final_output: dict[str, Any] | None = None

            # Resolve the model (handles "auto" and unknown models)
            print(f"[SYNC-DEBUG] run.selected_model={run.selected_model!r}", flush=True)
            resolved_model = self.resolve_model(run.selected_model, feature="sync")
            print(f"[SYNC-DEBUG] resolved_model={resolved_model!r}", flush=True)
            if run.selected_model != resolved_model:
                run.selected_model = resolved_model

            max_tool_loops = max(1, int(settings.SYNC_MAX_TOOL_LOOPS))
            tool_loop_count = 0

            while tool_loop_count <= max_tool_loops:
                llm_output = await LiteLLMClient.complete(
                    prompt=system_prompt,
                    user_message=clean_message,
                    model=resolved_model,
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

                            emitted_preview_payloads.append(self._serialize_preview_payload(preview))
                            yield await self._record_preview_event(run=run, preview=preview)
                            preview_emitted = True

                        question_candidate = execution.get("question") if isinstance(execution, dict) else None
                        if isinstance(question_candidate, dict):
                            question = await self._create_question(
                                run=run,
                                key=str(question_candidate.get("key") or "default"),
                                prompt=str(question_candidate.get("prompt") or ""),
                                options=question_candidate.get("options"),
                                help_text=question_candidate.get("help_text"),
                            )
                            yield await self._record_question_event(run=run, question=question)
                            run.status = "waiting_answer"
                            yield await self._record_plain_event(
                                run=run,
                                type_="done",
                                payload=SyncDonePayload(status=run.status).model_dump(mode="json"),
                            )
                            await self.db.commit()
                            return

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

            assistant_content_json: dict[str, Any] = {"text": assistant_content}
            if emitted_preview_payloads:
                assistant_content_json["metadata"] = {
                    "plan_preview": {
                        "type": "plan_preview",
                        "preview_ids": [
                            str(payload["id"])
                            for payload in emitted_preview_payloads
                            if isinstance(payload.get("id"), str)
                        ],
                        "previews": emitted_preview_payloads,
                    }
                }

            assistant_message = await self._create_message(
                run=run,
                role="assistant",
                content_json=assistant_content_json,
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

        except SyncValidationError as exc:
            run.status = "failed"
            yield await self._record_plain_event(
                run=run,
                type_="error",
                payload={
                    "code": "validation_error",
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
            return await self._build_apply_out(
                run_id=run.id,
                preview_id=preview_id,
                applied_at=existing_change.created_at,
                change=existing_change,
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
                return await self._build_apply_out(
                    run_id=run.id,
                    preview_id=preview.id,
                    applied_at=applied_change.created_at,
                    change=applied_change,
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

        apply_out = await self._build_apply_out(
            run_id=run.id,
            preview_id=preview.id,
            applied_at=now,
            change=change,
        )
        await self._record_plain_event(
            run=run,
            type_="applied",
            payload=apply_out.model_dump(mode="json"),
        )
        await self._record_plain_event(
            run=run,
            type_="done",
            payload=SyncDonePayload(status=run.status).model_dump(mode="json"),
        )

        await self.db.commit()
        return apply_out

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
            if change.undoable:
                change.undoable = False
                await self.db.commit()
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
        await self.db.flush()
        change.undoable = False
        run.status = "done"
        open_target_kind, open_target_id, open_target_date = await self._resolve_open_target(change)
        undone_payload = SyncUndonePayload(
            run_id=run.id,
            source_change_id=change.id,
            undo_change_id=undo_change.id,
            undone_at=now,
            open_target_kind=open_target_kind,
            open_target_id=open_target_id,
            open_target_date=open_target_date,
        )
        await self._record_plain_event(
            run=run,
            type_="undone",
            payload=undone_payload.model_dump(mode="json"),
        )
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

    async def _build_apply_out(
        self,
        *,
        run_id: uuid.UUID,
        preview_id: uuid.UUID,
        applied_at: datetime,
        change: AIChange,
    ) -> SyncApplyOut:
        open_target_kind, open_target_id, open_target_date = await self._resolve_open_target(change)
        return SyncApplyOut(
            run_id=run_id,
            preview_id=preview_id,
            change_id=change.id,
            applied_at=applied_at,
            undoable=change.undoable,
            entity_type=change.entity_type,
            entity_id=change.entity_id,
            open_target_kind=open_target_kind,
            open_target_id=open_target_id,
            open_target_date=open_target_date,
        )

    async def _normalize_replay_event_payload(
        self,
        *,
        run: AIRun,
        event_type: str,
        event_ts: datetime,
        payload: dict[str, Any],
        changes_by_id: dict[uuid.UUID, AIChange],
        undo_by_source_change_id: dict[uuid.UUID, AIChange],
    ) -> dict[str, Any]:
        if event_type == "applied":
            return await self._normalize_replay_applied_payload(
                run=run,
                event_ts=event_ts,
                payload=payload,
                changes_by_id=changes_by_id,
            )
        if event_type == "undone":
            return await self._normalize_replay_undone_payload(
                run=run,
                event_ts=event_ts,
                payload=payload,
                changes_by_id=changes_by_id,
                undo_by_source_change_id=undo_by_source_change_id,
            )
        return payload

    async def _normalize_replay_applied_payload(
        self,
        *,
        run: AIRun,
        event_ts: datetime,
        payload: dict[str, Any],
        changes_by_id: dict[uuid.UUID, AIChange],
    ) -> dict[str, Any]:
        change_id = self._parse_optional_uuid(payload.get("change_id"))
        change = changes_by_id.get(change_id) if change_id is not None else None

        entity_type = payload.get("entity_type") if isinstance(payload.get("entity_type"), str) else None
        entity_id = self._parse_optional_uuid(payload.get("entity_id"))
        open_target_kind = (
            payload.get("open_target_kind")
            if payload.get("open_target_kind") in {"item", "event", "timeline"}
            else None
        )
        open_target_id = self._parse_optional_uuid(payload.get("open_target_id"))
        open_target_date = self._normalize_open_target_date(payload.get("open_target_date"))

        if change is not None:
            if entity_type is None:
                entity_type = change.entity_type
            if entity_id is None:
                entity_id = change.entity_id
            (
                resolved_open_target_kind,
                resolved_open_target_id,
                resolved_open_target_date,
            ) = await self._resolve_open_target(change)
            if open_target_kind is None:
                open_target_kind = resolved_open_target_kind
            if open_target_id is None:
                open_target_id = resolved_open_target_id
            if open_target_date is None:
                open_target_date = (
                    resolved_open_target_date.isoformat()
                    if isinstance(resolved_open_target_date, date)
                    else None
                )

        preview_id = self._parse_optional_uuid(payload.get("preview_id"))
        normalized_change_id = change_id or run.id

        return {
            "run_id": str(run.id),
            "preview_id": str(preview_id or normalized_change_id),
            "change_id": str(normalized_change_id),
            "applied_at": self._normalize_datetime_value(payload.get("applied_at")) or event_ts.isoformat(),
            "undoable": bool(payload.get("undoable")) if "undoable" in payload else bool(change.undoable if change else False),
            "entity_type": entity_type or "unknown",
            "entity_id": str(entity_id) if entity_id is not None else None,
            "open_target_kind": open_target_kind or "timeline",
            "open_target_id": str(open_target_id) if open_target_id is not None else None,
            "open_target_date": open_target_date,
        }

    async def _normalize_replay_undone_payload(
        self,
        *,
        run: AIRun,
        event_ts: datetime,
        payload: dict[str, Any],
        changes_by_id: dict[uuid.UUID, AIChange],
        undo_by_source_change_id: dict[uuid.UUID, AIChange],
    ) -> dict[str, Any]:
        source_change_id = self._parse_optional_uuid(
            payload.get("source_change_id") or payload.get("change_id")
        )
        source_change = changes_by_id.get(source_change_id) if source_change_id is not None else None

        undo_change_id = self._parse_optional_uuid(payload.get("undo_change_id"))
        if undo_change_id is None and source_change_id is not None:
            matched_undo = undo_by_source_change_id.get(source_change_id)
            if matched_undo is not None:
                undo_change_id = matched_undo.id

        open_target_kind = (
            payload.get("open_target_kind")
            if payload.get("open_target_kind") in {"item", "event", "timeline"}
            else None
        )
        open_target_id = self._parse_optional_uuid(payload.get("open_target_id"))
        open_target_date = self._normalize_open_target_date(payload.get("open_target_date"))

        if source_change is not None:
            (
                resolved_open_target_kind,
                resolved_open_target_id,
                resolved_open_target_date,
            ) = await self._resolve_open_target(source_change)
            if open_target_kind is None:
                open_target_kind = resolved_open_target_kind
            if open_target_id is None:
                open_target_id = resolved_open_target_id
            if open_target_date is None:
                open_target_date = (
                    resolved_open_target_date.isoformat()
                    if isinstance(resolved_open_target_date, date)
                    else None
                )

        normalized_source_change_id = source_change_id or run.id
        return {
            "run_id": str(run.id),
            "source_change_id": str(normalized_source_change_id),
            "undo_change_id": str(undo_change_id) if undo_change_id is not None else None,
            "undone_at": self._normalize_datetime_value(payload.get("undone_at")) or event_ts.isoformat(),
            "open_target_kind": open_target_kind or "timeline",
            "open_target_id": str(open_target_id) if open_target_id is not None else None,
            "open_target_date": open_target_date,
        }

    async def _resolve_open_target(
        self,
        change: AIChange,
    ) -> tuple[str, uuid.UUID | None, date | None]:
        entity_type = (change.entity_type or "").strip().lower()
        action = (change.action or "").strip().lower()
        after_payload = change.after_payload if isinstance(change.after_payload, dict) else {}
        before_payload = change.before_payload if isinstance(change.before_payload, dict) else {}

        item_snapshot = after_payload.get("item") if isinstance(after_payload.get("item"), dict) else None
        item_before_snapshot = (
            before_payload.get("item") if isinstance(before_payload.get("item"), dict) else None
        )
        event_snapshot = after_payload.get("event") if isinstance(after_payload.get("event"), dict) else None
        event_before_snapshot = (
            before_payload.get("event") if isinstance(before_payload.get("event"), dict) else None
        )

        if entity_type == "item" or action.startswith("item."):
            item_id = (
                self._parse_optional_uuid(item_snapshot.get("id")) if item_snapshot else None
            ) or (
                self._parse_optional_uuid(item_before_snapshot.get("id"))
                if item_before_snapshot
                else None
            ) or change.entity_id
            return "item", item_id, None

        if entity_type == "event" or action.startswith("event."):
            event_id = (
                self._parse_optional_uuid(event_snapshot.get("id")) if event_snapshot else None
            ) or (
                self._parse_optional_uuid(event_before_snapshot.get("id"))
                if event_before_snapshot
                else None
            ) or change.entity_id
            event_date = self._extract_open_target_date_from_event(event_snapshot)
            if event_date is None:
                event_date = self._extract_open_target_date_from_event(event_before_snapshot)
            if event_date is None and event_id is not None:
                event_date = await self._fetch_event_date(event_id)
            return "event", event_id, event_date

        if entity_type == "capture" and action == "inbox.transform":
            if event_snapshot is not None or event_before_snapshot is not None:
                event_id = (
                    self._parse_optional_uuid(event_snapshot.get("id")) if event_snapshot else None
                ) or (
                    self._parse_optional_uuid(event_before_snapshot.get("id"))
                    if event_before_snapshot
                    else None
                )
                event_date = self._extract_open_target_date_from_event(event_snapshot)
                if event_date is None:
                    event_date = self._extract_open_target_date_from_event(event_before_snapshot)
                if event_date is None and event_id is not None:
                    event_date = await self._fetch_event_date(event_id)
                if event_id is not None:
                    return "event", event_id, event_date
                return "timeline", None, event_date

            if item_snapshot is not None or item_before_snapshot is not None:
                item_id = (
                    self._parse_optional_uuid(item_snapshot.get("id")) if item_snapshot else None
                ) or (
                    self._parse_optional_uuid(item_before_snapshot.get("id"))
                    if item_before_snapshot
                    else None
                )
                if item_id is not None:
                    return "item", item_id, None

            return "timeline", None, None

        return "timeline", None, None

    @staticmethod
    def _extract_open_target_date_from_event(event_snapshot: dict[str, Any] | None) -> date | None:
        if not isinstance(event_snapshot, dict):
            return None

        raw_start_at = event_snapshot.get("start_at")
        if isinstance(raw_start_at, datetime):
            return raw_start_at.date()
        if not isinstance(raw_start_at, str) or not raw_start_at.strip():
            return None

        normalized = raw_start_at.strip().replace("Z", "+00:00")
        try:
            return datetime.fromisoformat(normalized).date()
        except ValueError:
            return None

    async def _fetch_event_date(self, event_id: uuid.UUID) -> date | None:
        result = await self.db.execute(
            select(Event.start_at).where(
                Event.id == event_id,
                Event.workspace_id == self.workspace_id,
            )
        )
        start_at = result.scalar_one_or_none()
        if isinstance(start_at, datetime):
            return start_at.date()
        return None

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
        if detail:
            payload["detail"] = detail
        return await self._record_plain_event(run=run, type_="draft", payload=payload)

    async def _create_question(
        self,
        *,
        run: AIRun,
        key: str,
        prompt: str,
        options: list[str] | None = None,
        help_text: str | None = None,
    ) -> AIQuestion:
        seq = await self._next_seq(run)
        question = AIQuestion(
            run_id=run.id,
            seq=seq,
            key=key,
            prompt=prompt,
            options_json=options or [],
            help_text=help_text,
        )
        self.db.add(question)
        await self.db.flush()
        return question

    async def _record_question_event(self, *, run: AIRun, question: AIQuestion) -> SyncEventEnvelope:
        payload = SyncQuestionOut(
            id=question.id,
            run_id=question.run_id,
            seq=question.seq,
            key=question.key,
            prompt=question.prompt,
            help_text=question.help_text,
            options=question.options_json if isinstance(question.options_json, list) else [],
            created_at=question.created_at,
        ).model_dump(mode="json")
        return await self._record_plain_event(run=run, type_="question", payload=payload)

    async def _record_preview_event(self, *, run: AIRun, preview: AIDraft) -> SyncEventEnvelope:
        payload = self._serialize_preview_payload(preview)
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

    @staticmethod
    def _serialize_preview_payload(preview: AIDraft) -> dict[str, Any]:
        return {
            "id": str(preview.id),
            "run_id": str(preview.run_id),
            "seq": preview.seq,
            "entity_type": preview.entity_type,
            "entity_id": str(preview.entity_id) if preview.entity_id else None,
            "action": preview.action,
            "diff_json": preview.body_json if isinstance(preview.body_json, dict) else {},
            "expires_at": preview.expires_at.isoformat() if preview.expires_at else None,
            "undoable": preview.undoable,
            "created_at": preview.created_at.isoformat(),
        }

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
        preview_reuse_context = await self._build_preview_reuse_context(run=run)
        if preview_reuse_context:
            messages.append({"role": "system", "content": preview_reuse_context})
        for row in rows:
            role = row.role if row.role in {"system", "user", "assistant", "tool"} else "user"
            content = self._extract_message_text(row.content_json)
            messages.append({"role": role, "content": content})
        return messages

    async def _build_preview_reuse_context(self, *, run: AIRun) -> str | None:
        result = await self.db.execute(
            select(AIDraft)
            .where(
                AIDraft.run_id == run.id,
                AIDraft.kind == "preview",
                AIDraft.deleted_at.is_(None),
            )
            .order_by(AIDraft.seq.desc())
            .limit(3)
        )
        rows = list(result.scalars().all())
        if not rows:
            return None

        snapshots = [
            {
                "preview_id": str(row.id),
                "seq": row.seq,
                "entity_type": row.entity_type,
                "entity_id": str(row.entity_id) if row.entity_id else None,
                "action": row.action,
                "diff_json": row.body_json if isinstance(row.body_json, dict) else {},
                "applied": row.applied_change_id is not None,
            }
            for row in rows
        ]
        return (
            "Persisted plan previews context (latest first). If the user asks to update or reuse a "
            "previous plan, start from one of these previews and change only requested fields:\n"
            f"{json.dumps(snapshots, ensure_ascii=True)}"
        )

    async def _execute_tool_call(
        self,
        *,
        tool_name: str,
        args: dict[str, Any],
        user_message: str,
    ) -> dict[str, Any]:
        if tool_name == "calendar_events_range":
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

        if tool_name == "calendar_preferences_get":
            preferences = await self._calendar_preferences_get()
            return {
                "summary": "Calendar preferences loaded",
                "result_json": preferences,
            }

        if tool_name == "calendar_patterns_suggest":
            title = str(args.get("title") or "").strip() or user_message.strip()
            if not title:
                raise SyncValidationError("calendar.patterns.suggest requires title")
            suggestion = await self._calendar_patterns_suggest(title=title)
            return {
                "summary": "Pattern suggestion ready",
                "result_json": suggestion,
            }

        if tool_name == "travel_estimate":
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

        if tool_name == "memory_search":
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

        if tool_name == "item_preview":
            preview = ToolExecutor.build_item_preview(args, user_message)
            return {
                "summary": str(preview.get("summary") or "Preview generated"),
                "result_json": preview,
                "preview": preview,
            }

        if tool_name == "event_preview":
            preview = ToolExecutor.build_event_preview(args, user_message)
            return {
                "summary": str(preview.get("summary") or "Preview generated"),
                "result_json": preview,
                "preview": preview,
            }

        if tool_name == "inbox_transform_preview":
            preview = ToolExecutor.build_inbox_transform_preview(args, user_message)
            return {
                "summary": str(preview.get("summary") or "Preview generated"),
                "result_json": preview,
                "preview": preview,
            }

        if tool_name == "ask_question":
            question_data = ToolExecutor.build_ask_question(args)
            return {
                "summary": str(question_data.get("summary") or "Question asked"),
                "result_json": question_data,
                "question": question_data,
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
    def _is_explicit_mutation_intent(message: str) -> bool:
        lowered = message.lower()
        mutation_patterns = (
            r"\b(create|add|update|edit|modify|delete|remove|schedule|reschedule|transform|apply)\b",
            r"\b(cr(?:e|é)e(?:r)?|ajoute(?:r)?|planifie(?:r)?|programme(?:r)?|modifie(?:r)?|mets?\s+à\s+jour|"
            r"supprime(?:r)?|enl[eè]ve(?:r)?|d[eé]place(?:r)?|transforme(?:r)?|applique(?:r)?|annule(?:r)?)\b",
        )
        return any(re.search(pattern, lowered) is not None for pattern in mutation_patterns)

    @staticmethod
    def _compact_text(value: Any, *, limit: int = 220) -> str:
        if not isinstance(value, str):
            return ""
        compact = " ".join(value.split()).strip()
        if len(compact) <= limit:
            return compact
        return f"{compact[: max(0, limit - 1)]}…"

    @staticmethod
    def _normalize_stream_attachments(raw_attachments: list[Any] | None) -> list[dict[str, str]]:
        normalized: list[dict[str, str]] = []
        seen: set[tuple[str, str]] = set()
        for raw in raw_attachments or []:
            if isinstance(raw, dict):
                capture_id = raw.get("capture_id")
                source = raw.get("source")
            else:
                capture_id = getattr(raw, "capture_id", None)
                source = getattr(raw, "source", None)
            capture_id_str = str(capture_id).strip() if capture_id is not None else ""
            source_str = str(source or "upload").strip().lower()
            if source_str not in {"upload", "inbox"}:
                source_str = "upload"
            if not capture_id_str:
                continue
            dedupe_key = (capture_id_str, source_str)
            if dedupe_key in seen:
                continue
            seen.add(dedupe_key)
            normalized.append(
                {
                    "capture_id": capture_id_str,
                    "source": source_str,
                }
            )
        return normalized

    @staticmethod
    def _normalize_stream_references(raw_references: list[Any] | None) -> list[dict[str, str | None]]:
        normalized: list[dict[str, str | None]] = []
        seen: set[tuple[str, str]] = set()
        for raw in raw_references or []:
            if isinstance(raw, dict):
                kind = raw.get("kind")
                ref_id = raw.get("id")
                label = raw.get("label")
            else:
                kind = getattr(raw, "kind", None)
                ref_id = getattr(raw, "id", None)
                label = getattr(raw, "label", None)
            kind_str = str(kind or "").strip().lower()
            if kind_str not in {"capture", "item"}:
                continue
            ref_id_str = str(ref_id).strip() if ref_id is not None else ""
            if not ref_id_str:
                continue
            dedupe_key = (kind_str, ref_id_str)
            if dedupe_key in seen:
                continue
            seen.add(dedupe_key)
            normalized.append(
                {
                    "kind": kind_str,
                    "id": ref_id_str,
                    "label": str(label).strip() if isinstance(label, str) and label.strip() else None,
                }
            )
        return normalized

    async def _resolve_sync_context(
        self,
        *,
        attachments: list[dict[str, str]],
        references: list[dict[str, str | None]],
    ) -> dict[str, Any]:
        if len(attachments) + len(references) > 5:
            raise SyncValidationError("You can attach or reference up to 5 elements per message.")

        warnings: list[dict[str, str]] = []
        source_items: list[dict[str, str | None]] = []
        workspace_notes: list[str] = []
        resolved_entries: list[dict[str, Any]] = []

        for attachment in attachments:
            capture_id = self._parse_optional_uuid(attachment.get("capture_id"))
            if capture_id is None:
                warnings.append(
                    {
                        "code": "sync_context_invalid_attachment",
                        "message": "One attachment has an invalid capture identifier.",
                    }
                )
                continue

            capture = await self._load_capture_for_workspace(capture_id)
            if capture is None:
                if await self._capture_exists_any_workspace(capture_id):
                    raise SyncValidationError("Attachment is not accessible in this workspace.")
                warnings.append(
                    {
                        "code": "sync_context_attachment_missing",
                        "message": "One attachment was not found and was ignored.",
                    }
                )
                continue

            if capture.status not in {"ready", "applied", "archived"}:
                raise SyncValidationError(
                    "An attachment is still processing. Wait until it is ready before sending."
                )

            context_entry = self._build_capture_context_entry(
                capture,
                source=attachment.get("source") or "upload",
                label_override=None,
            )
            resolved_entries.append(context_entry["resolved"])
            workspace_notes.append(context_entry["note"])
            source_items.append(context_entry["source"])

        for reference in references:
            kind = str(reference.get("kind") or "").lower()
            ref_id = self._parse_optional_uuid(reference.get("id"))
            if kind not in {"capture", "item"} or ref_id is None:
                warnings.append(
                    {
                        "code": "sync_context_invalid_reference",
                        "message": "One reference has an invalid format and was ignored.",
                    }
                )
                continue

            label_override = (
                str(reference.get("label")).strip()
                if isinstance(reference.get("label"), str) and str(reference.get("label")).strip()
                else None
            )

            if kind == "capture":
                capture = await self._load_capture_for_workspace(ref_id)
                if capture is None:
                    if await self._capture_exists_any_workspace(ref_id):
                        raise SyncValidationError("A capture reference is not accessible in this workspace.")
                    warnings.append(
                        {
                            "code": "sync_context_reference_missing",
                            "message": "One capture reference was not found and was ignored.",
                        }
                    )
                    continue
                context_entry = self._build_capture_context_entry(
                    capture,
                    source="reference",
                    label_override=label_override,
                )
            else:
                item = await self._load_item_for_workspace(ref_id)
                if item is None:
                    if await self._item_exists_any_workspace(ref_id):
                        raise SyncValidationError("An item reference is not accessible in this workspace.")
                    warnings.append(
                        {
                            "code": "sync_context_reference_missing",
                            "message": "One item reference was not found and was ignored.",
                        }
                    )
                    continue
                context_entry = self._build_item_context_entry(item, label_override=label_override)

            resolved_entries.append(context_entry["resolved"])
            workspace_notes.append(context_entry["note"])
            source_items.append(context_entry["source"])

        metadata: dict[str, Any] = {}
        if attachments or references or resolved_entries or warnings:
            metadata = {
                "attachments": attachments,
                "references": references,
                "resolved": resolved_entries,
                "warnings": warnings,
            }

        return {
            "metadata": metadata,
            "warnings": warnings,
            "sources": source_items,
            "workspace_notes": workspace_notes,
        }

    @staticmethod
    def _capture_context_title(capture: InboxCapture) -> str:
        meta = capture.meta if isinstance(capture.meta, dict) else {}
        for key in ("manual_title", "ai_title", "title"):
            value = meta.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
        compact_raw = SyncOrchestrator._compact_text(capture.raw_content, limit=96)
        if compact_raw:
            return compact_raw
        return f"Capture {str(capture.id)[:8]}"

    @staticmethod
    def _capture_context_snippet(capture: InboxCapture) -> str:
        meta = capture.meta if isinstance(capture.meta, dict) else {}
        for key in ("summary", "ai_summary", "note_summary", "preview_text"):
            value = meta.get(key)
            compact = SyncOrchestrator._compact_text(value, limit=260)
            if compact:
                return compact
        return SyncOrchestrator._compact_text(capture.raw_content, limit=260)

    @classmethod
    def _extract_blocks_text(cls, node: Any) -> str:
        if isinstance(node, list):
            parts = [cls._extract_blocks_text(entry) for entry in node]
            return " ".join(part for part in parts if part).strip()
        if not isinstance(node, dict):
            return ""
        own_text = str(node.get("text")).strip() if isinstance(node.get("text"), str) else ""
        child_content = cls._extract_blocks_text(node.get("content")) if isinstance(node.get("content"), list) else ""
        return " ".join(part for part in (own_text, child_content) if part).strip()

    def _build_capture_context_entry(
        self,
        capture: InboxCapture,
        *,
        source: str,
        label_override: str | None,
    ) -> dict[str, Any]:
        title = label_override or self._capture_context_title(capture)
        snippet = self._capture_context_snippet(capture)
        subtitle = f"{capture.capture_type} · {capture.status}"
        internal_path = f"/inbox/captures/{capture.id}"
        note = f'Capture "{title}" ({subtitle}).'
        if snippet:
            note = f'{note} Snippet: "{snippet}"'
        return {
            "resolved": {
                "kind": "capture",
                "id": str(capture.id),
                "label": title,
                "subtitle": subtitle,
                "internal_path": internal_path,
                "status": capture.status,
                "capture_type": capture.capture_type,
                "source": source,
            },
            "source": {
                "id": str(capture.id),
                "title": title,
                "url": f"https://momentarise.local{internal_path}",
                "snippet": snippet or None,
            },
            "note": note,
        }

    def _build_item_context_entry(
        self,
        item: Item,
        *,
        label_override: str | None,
    ) -> dict[str, Any]:
        title = label_override or item.title or f"Item {str(item.id)[:8]}"
        excerpt = self._compact_text(self._extract_blocks_text(item.blocks), limit=260)
        subtitle = f"{item.kind} · {item.status}"
        internal_path = f"/inbox/items/{item.id}"
        note = f'Item "{title}" ({subtitle}).'
        if excerpt:
            note = f'{note} Excerpt: "{excerpt}"'
        return {
            "resolved": {
                "kind": "item",
                "id": str(item.id),
                "label": title,
                "subtitle": subtitle,
                "internal_path": internal_path,
                "status": item.status,
                "source": "reference",
            },
            "source": {
                "id": str(item.id),
                "title": title,
                "url": f"https://momentarise.local{internal_path}",
                "snippet": excerpt or None,
            },
            "note": note,
        }

    async def _load_capture_for_workspace(self, capture_id: uuid.UUID) -> InboxCapture | None:
        result = await self.db.execute(
            select(InboxCapture).where(
                InboxCapture.id == capture_id,
                InboxCapture.workspace_id == self.workspace_id,
                InboxCapture.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def _capture_exists_any_workspace(self, capture_id: uuid.UUID) -> bool:
        result = await self.db.execute(
            select(InboxCapture.id).where(
                InboxCapture.id == capture_id,
                InboxCapture.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none() is not None

    async def _load_item_for_workspace(self, item_id: uuid.UUID) -> Item | None:
        result = await self.db.execute(
            select(Item).where(
                Item.id == item_id,
                Item.workspace_id == self.workspace_id,
                Item.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def _item_exists_any_workspace(self, item_id: uuid.UUID) -> bool:
        result = await self.db.execute(
            select(Item.id).where(
                Item.id == item_id,
                Item.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none() is not None

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
    def _parse_source_change_id_from_undo_reason(reason: Any) -> uuid.UUID | None:
        if not isinstance(reason, str):
            return None
        if not reason.startswith("sync_undo:"):
            return None
        parts = reason.split(":")
        if len(parts) < 3:
            return None
        return SyncOrchestrator._parse_optional_uuid(parts[1])

    @staticmethod
    def _normalize_open_target_date(value: Any) -> str | None:
        if isinstance(value, datetime):
            return value.date().isoformat()
        if isinstance(value, date):
            return value.isoformat()
        if isinstance(value, str) and value.strip():
            raw = value.strip()
            try:
                if "T" in raw:
                    normalized = raw.replace("Z", "+00:00")
                    return datetime.fromisoformat(normalized).date().isoformat()
                return date.fromisoformat(raw).isoformat()
            except ValueError:
                return None
        return None

    @staticmethod
    def _normalize_datetime_value(value: Any) -> str | None:
        if isinstance(value, datetime):
            return value.isoformat()
        if isinstance(value, str) and value.strip():
            raw = value.strip()
            normalized = raw.replace("Z", "+00:00")
            try:
                return datetime.fromisoformat(normalized).isoformat()
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
    def available_models(*, feature: str = "sync") -> list[dict]:
        """Return all models available for a given feature, filtered by API keys."""
        models = _registry_get_models(feature=feature)
        # Add is_default flag (the auto-route default for the free tier)
        default_id = resolve_auto_model(feature, user_tier="free")
        for model in models:
            model["is_default"] = model["id"] == default_id
        return models

    @staticmethod
    def resolve_model(
        selected_model: str | None,
        *,
        feature: str = "sync",
        user_tier: str = "free",
    ) -> str:
        """
        Resolve the actual model ID to use.

        Priority:
        1. Explicit model selected by user (unless it's 'auto')
        2. Auto routing based on feature + user tier
        3. Fallback to .env defaults
        """
        if selected_model and selected_model.strip().lower() != "auto":
            # Verify the model exists in the registry
            entry = get_model_entry(selected_model)
            if entry is not None:
                return selected_model
            # Unknown model — fall through to auto

        # Auto mode: pick the best model for this feature × tier
        return resolve_auto_model(feature, user_tier=user_tier)
