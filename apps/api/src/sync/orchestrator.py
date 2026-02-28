import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.ai_change import AIChange
from src.models.ai_draft import AIDraft
from src.models.ai_event import AIEvent
from src.models.ai_message import AIMessage
from src.models.ai_question import AIQuestion
from src.models.ai_run import AIRun
from src.models.ai_tool_call import AIToolCall
from src.models.ai_usage_event import AIUsageEvent
from src.models.agent_profile import AgentProfile
from src.schemas.sync import SyncApplyOut, SyncDonePayload, SyncEventEnvelope, SyncRunOut, SyncUndoOut
from src.sync.litellm_client import LiteLLMClient
from src.sync.prompt_composer import PromptComposer, PromptComposerInput
from src.sync.retrieval import RetrievalService
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
            prompt_version="v1",
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

        if from_seq is not None:
            replayed = await self.replay_events(run, from_seq)
            events.extend(replayed)

        clean_message = message.strip()
        if not clean_message:
            return events

        run.status = "streaming"

        user_message = await self._create_message(
            run=run,
            role="user",
            content_json={"text": clean_message},
        )
        events.append(await self._record_message_event(run=run, message=user_message))

        snippets = await RetrievalService.search(
            self.db,
            workspace_id=self.workspace_id,
            query=clean_message,
            limit=5,
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

        system_prompt, retrieval_snapshot, tool_snapshot = PromptComposer.compose(
            PromptComposerInput(
                agent_name=agent_profile.name if agent_profile else "Sync",
                prompt_mode=prompt_mode,
                user_message=clean_message,
                retrieval_snippets=snippets,
                allowed_tools=tools,
            )
        )
        if prompt_instructions:
            system_prompt = f"{system_prompt}\nExtra instructions: {prompt_instructions}"

        run.prompt_version = "v1"
        run.prompt_mode = prompt_mode
        run.system_prompt_snapshot = system_prompt
        run.toolset_snapshot = tool_snapshot
        run.retrieval_snapshot = retrieval_snapshot

        llm_output = await LiteLLMClient.complete(
            prompt=system_prompt,
            user_message=clean_message,
            model=run.selected_model,
        )

        token_event = await self._record_plain_event(
            run=run,
            type_="token",
            payload={"delta": llm_output["content"]},
        )
        events.append(token_event)

        assistant_message = await self._create_message(
            run=run,
            role="assistant",
            content_json={"text": llm_output["content"]},
            provider=llm_output["provider"],
            model=llm_output["model"],
            usage_json=llm_output["usage"],
        )
        events.append(await self._record_message_event(run=run, message=assistant_message))

        usage_event = await self._create_usage_event(
            run=run,
            provider=llm_output["provider"],
            model=llm_output["model"],
            usage=llm_output["usage"],
        )
        events.append(await self._record_usage_event(run=run, usage=usage_event))

        draft = await self._create_draft(
            run=run,
            kind="draft",
            title="Assistant draft",
            body_json={
                "text": llm_output["content"],
                "snippets": retrieval_snapshot,
                "tools": tool_snapshot,
            },
            summary="Initial assistant draft",
        )
        events.append(await self._record_draft_event(run=run, draft=draft))

        if self._message_requires_preview(clean_message):
            tool_call = await self._create_tool_call(
                run=run,
                tool_name="inbox.preview_changes",
                args_json={"message": clean_message},
                requires_confirmation=True,
            )
            events.append(await self._record_tool_call_event(run=run, tool_call=tool_call, status="started"))

            preview_body = ToolExecutor.build_preview_from_message(clean_message)
            preview = await self._create_draft(
                run=run,
                kind="preview",
                title="Proposed preview",
                body_json=preview_body,
                summary=preview_body.get("summary"),
                entity_type="item",
                action="update_item",
                expires_at=ToolExecutor.default_preview_expiry(),
                undoable=True,
            )
            events.append(await self._record_preview_event(run=run, preview=preview))

            tool_call.status = "completed"
            tool_call.result_json = preview_body
            events.append(
                await self._record_tool_result_event(
                    run=run,
                    tool_call=tool_call,
                    status="completed",
                    summary="Preview generated",
                )
            )
            run.status = "ready_to_apply"
        else:
            run.status = "done"

        done_event = await self._record_plain_event(
            run=run,
            type_="done",
            payload=SyncDonePayload(status=run.status).model_dump(mode="json"),
        )
        events.append(done_event)

        await self.db.commit()
        return events

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

        now = datetime.now(UTC)
        if preview.expires_at is not None and preview.expires_at < now:
            raise SyncValidationError("Preview expired")

        change = AIChange(
            workspace_id=self.workspace_id,
            actor_user_id=self.user_id,
            run_id=run.id,
            entity_type=preview.entity_type or "item",
            entity_id=preview.entity_id or uuid.uuid4(),
            action=preview.action or "apply_preview",
            reason=f"sync_apply:{idempotency_key}",
            before_payload=None,
            after_payload={
                "preview_id": str(preview.id),
                "payload": preview.body_json,
                "idempotency_key": idempotency_key,
            },
            undoable=preview.undoable,
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

        now = datetime.now(UTC)
        undo_change = AIChange(
            workspace_id=self.workspace_id,
            actor_user_id=self.user_id,
            run_id=run.id,
            entity_type=change.entity_type,
            entity_id=change.entity_id,
            action=f"undo:{change.action}",
            reason=reason,
            before_payload=change.after_payload,
            after_payload=change.before_payload,
            undoable=False,
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

    @staticmethod
    def _message_requires_preview(message: str) -> bool:
        tokens = {"apply", "change", "update", "schedule", "create", "plan", "organize"}
        low = message.lower()
        return any(token in low for token in tokens)

    @staticmethod
    def run_to_out(run: AIRun) -> SyncRunOut:
        return SyncRunOut.model_validate(run)

    @staticmethod
    def available_models() -> list[dict]:
        return [
            {
                "id": "openai/gpt-4.1-mini",
                "provider": "openai",
                "label": "GPT-4.1 Mini",
                "is_default": True,
                "capabilities": {
                    "supports_tools": True,
                    "supports_vision": True,
                    "supports_json_schema": True,
                    "max_context": 128000,
                    "cost_hint": "balanced",
                },
            },
            {
                "id": "anthropic/claude-3-7-sonnet",
                "provider": "anthropic",
                "label": "Claude 3.7 Sonnet",
                "is_default": False,
                "capabilities": {
                    "supports_tools": True,
                    "supports_vision": True,
                    "supports_json_schema": True,
                    "max_context": 200000,
                    "cost_hint": "reasoning",
                },
            },
        ]
