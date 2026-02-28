import json
import uuid
from datetime import UTC, datetime
from typing import Any

import jwt
from fastapi import APIRouter, Depends, HTTPException, Query, Request, WebSocket, WebSocketDisconnect, status
from fastapi.responses import StreamingResponse
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.database import get_db
from src.core.deps import get_current_user, get_current_workspace
from src.models.ai_change import AIChange
from src.models.agent_profile import AgentProfile, AgentProfileVersion
from src.models.ai_message import AIMessage
from src.models.ai_run import AIRun
from src.models.automation_spec import AutomationSpec
from src.models.user import User
from src.models.workspace import WorkspaceMember
from src.schemas.sync import (
    SyncAgentsResponse,
    SyncAgentOut,
    SyncApplyOut,
    SyncApplyRequest,
    SyncAutomationOut,
    SyncAutomationsResponse,
    SyncChangesResponse,
    SyncChangeOut,
    SyncCreateAgentRequest,
    SyncCreateAutomationRequest,
    SyncCreateRunRequest,
    SyncEventEnvelope,
    SyncModelListResponse,
    SyncPatchAgentRequest,
    SyncPatchAutomationRequest,
    SyncPublishAgentVersionResponse,
    SyncRunListResponse,
    SyncRunSummaryOut,
    SyncResumeMessage,
    SyncEventsResponse,
    SyncRunOut,
    SyncRunResponse,
    SyncStreamRequest,
    SyncUndoOut,
    SyncUndoRequest,
    SyncValidateAutomationResponse,
    SyncAnswerRequest,
    SyncWSTokenResponse,
)
from src.sync.orchestrator import SyncNotFoundError, SyncOrchestrator, SyncValidationError
from src.sync.ws_auth import issue_ws_token, verify_ws_token

router = APIRouter(prefix="/sync", tags=["sync"])


async def _get_run_or_404(
    db: AsyncSession,
    *,
    workspace_id: uuid.UUID,
    run_id: uuid.UUID,
) -> AIRun:
    result = await db.execute(
        select(AIRun).where(
            AIRun.id == run_id,
            AIRun.workspace_id == workspace_id,
            AIRun.deleted_at.is_(None),
        )
    )
    run = result.scalar_one_or_none()
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")
    return run


def _extract_message_preview(content_json: dict[str, Any] | None) -> str:
    if not isinstance(content_json, dict):
        return ""

    raw = content_json.get("text")
    if not isinstance(raw, str):
        raw = content_json.get("content")
    if not isinstance(raw, str):
        try:
            raw = json.dumps(content_json, ensure_ascii=True)
        except Exception:
            raw = ""

    compact = " ".join(raw.split())
    if len(compact) <= 180:
        return compact
    return f"{compact[:177]}..."


@router.get("/models", response_model=SyncModelListResponse)
async def get_models() -> SyncModelListResponse:
    return SyncModelListResponse(models=SyncOrchestrator.available_models())


@router.post("/runs", response_model=SyncRunResponse, status_code=status.HTTP_201_CREATED)
async def create_run(
    body: SyncCreateRunRequest,
    current_user: User = Depends(get_current_user),
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> SyncRunResponse:
    orchestrator = SyncOrchestrator(
        db=db,
        workspace_id=workspace.workspace_id,
        user_id=current_user.id,
    )
    run = await orchestrator.create_run(
        mode=body.mode,
        model=body.model,
        agent_id=body.agent_id,
        title=body.title,
        context_json=body.context_json,
    )
    return SyncRunResponse(run=SyncRunOut.model_validate(run))


@router.get("/runs/{run_id}", response_model=SyncRunResponse)
async def get_run(
    run_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> SyncRunResponse:
    orchestrator = SyncOrchestrator(
        db=db,
        workspace_id=workspace.workspace_id,
        user_id=current_user.id,
    )
    try:
        run = await orchestrator.get_run_or_raise(run_id)
    except SyncNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return SyncRunResponse(run=SyncRunOut.model_validate(run))


@router.get("/runs", response_model=SyncRunListResponse)
async def list_runs(
    limit: int = Query(default=30, ge=1, le=100),
    cursor: str | None = Query(default=None),
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> SyncRunListResponse:
    cursor_dt: datetime | None = None
    if cursor:
        try:
            raw = cursor.replace("Z", "+00:00")
            parsed = datetime.fromisoformat(raw)
            cursor_dt = parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid cursor") from exc

    filters: list[Any] = [
        AIRun.workspace_id == workspace.workspace_id,
        AIRun.deleted_at.is_(None),
    ]
    if cursor_dt is not None:
        filters.append(AIRun.updated_at < cursor_dt)

    run_result = await db.execute(
        select(AIRun)
        .where(*filters)
        .order_by(AIRun.updated_at.desc(), AIRun.id.desc())
        .limit(limit + 1)
    )
    fetched_runs = list(run_result.scalars().all())
    has_more = len(fetched_runs) > limit
    runs = fetched_runs[:limit]

    run_ids = [run.id for run in runs]
    message_by_run_id: dict[uuid.UUID, AIMessage] = {}
    if run_ids:
        latest_seq_subquery = (
            select(
                AIMessage.run_id.label("run_id"),
                func.max(AIMessage.seq).label("max_seq"),
            )
            .where(
                AIMessage.run_id.in_(run_ids),
                AIMessage.deleted_at.is_(None),
            )
            .group_by(AIMessage.run_id)
            .subquery()
        )
        message_result = await db.execute(
            select(AIMessage).join(
                latest_seq_subquery,
                and_(
                    AIMessage.run_id == latest_seq_subquery.c.run_id,
                    AIMessage.seq == latest_seq_subquery.c.max_seq,
                ),
            )
        )
        for message in message_result.scalars().all():
            message_by_run_id[message.run_id] = message

    summaries: list[SyncRunSummaryOut] = []
    for run in runs:
        message = message_by_run_id.get(run.id)
        summaries.append(
            SyncRunSummaryOut(
                id=run.id,
                status=run.status,  # type: ignore[arg-type]
                title=run.title,
                selected_model=run.selected_model,
                updated_at=run.updated_at,
                last_message_preview=_extract_message_preview(message.content_json) if message else None,
                last_message_at=message.created_at if message else None,
            )
        )

    next_cursor = None
    if has_more and runs:
        next_cursor = runs[-1].updated_at.isoformat()

    return SyncRunListResponse(runs=summaries, next_cursor=next_cursor)


@router.get("/runs/{run_id}/events", response_model=SyncEventsResponse)
async def list_run_events(
    run_id: uuid.UUID,
    from_seq: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> SyncEventsResponse:
    orchestrator = SyncOrchestrator(
        db=db,
        workspace_id=workspace.workspace_id,
        user_id=current_user.id,
    )
    run = await _get_run_or_404(db, workspace_id=workspace.workspace_id, run_id=run_id)
    events = await orchestrator.replay_events(run, from_seq)
    return SyncEventsResponse(
        run_id=run.id,
        from_seq=from_seq,
        last_seq=run.last_seq,
        events=events,
    )


@router.post("/runs/{run_id}/stream")
async def stream_run(
    run_id: uuid.UUID,
    body: SyncStreamRequest,
    from_seq_query: int | None = Query(default=None, alias="from_seq"),
    current_user: User = Depends(get_current_user),
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
):
    orchestrator = SyncOrchestrator(
        db=db,
        workspace_id=workspace.workspace_id,
        user_id=current_user.id,
    )
    try:
        run = await orchestrator.get_run_or_raise(run_id)
        effective_from_seq = body.from_seq if body.from_seq is not None else from_seq_query
    except SyncNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    async def event_generator():
        async for event in orchestrator.stream_run_iter(
            run=run,
            message=body.message,
            from_seq=effective_from_seq,
        ):
            payload = event.model_dump(mode="json")
            yield f"data: {json.dumps(payload, ensure_ascii=True)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-store",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/runs/{run_id}/answer", response_model=SyncRunResponse)
async def answer_run(
    run_id: uuid.UUID,
    body: SyncAnswerRequest,
    current_user: User = Depends(get_current_user),
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> SyncRunResponse:
    orchestrator = SyncOrchestrator(
        db=db,
        workspace_id=workspace.workspace_id,
        user_id=current_user.id,
    )
    try:
        run = await orchestrator.get_run_or_raise(run_id)
        await orchestrator.mark_answer(run=run, answer=body.answer, question_id=body.question_id)
    except SyncNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return SyncRunResponse(run=SyncRunOut.model_validate(run))


@router.post("/runs/{run_id}/apply", response_model=SyncApplyOut)
async def apply_run(
    run_id: uuid.UUID,
    body: SyncApplyRequest,
    current_user: User = Depends(get_current_user),
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> SyncApplyOut:
    orchestrator = SyncOrchestrator(
        db=db,
        workspace_id=workspace.workspace_id,
        user_id=current_user.id,
    )
    try:
        run = await orchestrator.get_run_or_raise(run_id)
        return await orchestrator.apply_preview(
            run=run,
            preview_id=body.preview_id,
            idempotency_key=body.idempotency_key,
        )
    except SyncNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except SyncValidationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.post("/runs/{run_id}/undo", response_model=SyncUndoOut)
async def undo_run(
    run_id: uuid.UUID,
    body: SyncUndoRequest,
    current_user: User = Depends(get_current_user),
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> SyncUndoOut:
    orchestrator = SyncOrchestrator(
        db=db,
        workspace_id=workspace.workspace_id,
        user_id=current_user.id,
    )
    try:
        run = await orchestrator.get_run_or_raise(run_id)
        return await orchestrator.undo_change(
            run=run,
            change_id=body.change_id,
            idempotency_key=body.idempotency_key,
        )
    except SyncNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except SyncValidationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.get("/changes", response_model=SyncChangesResponse)
async def list_changes(
    run_id: uuid.UUID | None = Query(default=None),
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> SyncChangesResponse:
    filters: list[Any] = [
        AIChange.workspace_id == workspace.workspace_id,
        AIChange.deleted_at.is_(None),
    ]
    if run_id is not None:
        filters.append(AIChange.run_id == run_id)

    result = await db.execute(
        select(AIChange).where(*filters).order_by(AIChange.created_at.desc()).limit(100)
    )
    changes = list(result.scalars().all())
    return SyncChangesResponse(changes=[SyncChangeOut.model_validate(change) for change in changes])


@router.post("/runs/{run_id}/ws-token", response_model=SyncWSTokenResponse)
async def create_ws_token(
    run_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> SyncWSTokenResponse:
    await _get_run_or_404(db, workspace_id=workspace.workspace_id, run_id=run_id)
    token, expires_at = issue_ws_token(user_id=current_user.id, run_id=run_id, ttl_seconds=90)

    base = str(request.base_url).rstrip("/")
    if base.startswith("https://"):
        ws_base = "wss://" + base[len("https://") :]
    elif base.startswith("http://"):
        ws_base = "ws://" + base[len("http://") :]
    else:
        ws_base = base

    ws_url = f"{ws_base}/api/v1/sync/runs/{run_id}/ws"
    return SyncWSTokenResponse(ws_url=ws_url, token=token, expires_at=expires_at)


@router.websocket("/runs/{run_id}/ws")
async def run_ws(
    websocket: WebSocket,
    run_id: uuid.UUID,
    token: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        claims = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id = uuid.UUID(str(claims.get("sub")))
    except Exception:
        await websocket.close(code=4401)
        return

    try:
        verify_ws_token(token=token, expected_user_id=user_id, expected_run_id=run_id)
    except Exception:
        await websocket.close(code=4401)
        return

    run_result = await db.execute(
        select(AIRun).where(AIRun.id == run_id, AIRun.deleted_at.is_(None))
    )
    run = run_result.scalar_one_or_none()
    if run is None:
        await websocket.close(code=4404)
        return

    orchestrator = SyncOrchestrator(db=db, workspace_id=run.workspace_id, user_id=user_id)
    await websocket.accept()

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue

            if data.get("type") == "resume":
                try:
                    resume = SyncResumeMessage.model_validate(data)
                except Exception:
                    continue
                replay = await orchestrator.replay_events(run, resume.from_seq)
                for event in replay:
                    await websocket.send_json(event.model_dump(mode="json"))
                continue

            if data.get("type") == "message":
                message = str(data.get("message") or "")
                from_seq = data.get("from_seq")
                if from_seq is not None:
                    try:
                        from_seq = int(from_seq)
                    except (TypeError, ValueError):
                        from_seq = None
                async for event in orchestrator.stream_run_iter(
                    run=run, message=message, from_seq=from_seq
                ):
                    await websocket.send_json(event.model_dump(mode="json"))
                continue
    except WebSocketDisconnect:
        return


@router.get("/agents", response_model=SyncAgentsResponse)
async def list_agents(
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> SyncAgentsResponse:
    result = await db.execute(
        select(AgentProfile)
        .where(
            AgentProfile.workspace_id == workspace.workspace_id,
            AgentProfile.deleted_at.is_(None),
        )
        .order_by(AgentProfile.updated_at.desc())
    )
    agents = list(result.scalars().all())
    return SyncAgentsResponse(agents=[SyncAgentOut.model_validate(agent) for agent in agents])


@router.post("/agents", response_model=SyncAgentOut, status_code=status.HTTP_201_CREATED)
async def create_agent(
    body: SyncCreateAgentRequest,
    current_user: User = Depends(get_current_user),
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> SyncAgentOut:
    if body.is_default:
        await db.execute(
            select(AgentProfile)
            .where(
                AgentProfile.workspace_id == workspace.workspace_id,
                AgentProfile.is_default.is_(True),
                AgentProfile.deleted_at.is_(None),
            )
        )

    agent = AgentProfile(
        workspace_id=workspace.workspace_id,
        created_by_user_id=current_user.id,
        origin="user",
        name=body.name,
        description=body.description,
        prompt_mode=body.prompt_mode,
        prompt_instructions=body.prompt_instructions,
        tool_policy_json=body.tool_policy_json,
        memory_scope_json=body.memory_scope_json,
        is_default=body.is_default,
        is_active=True,
    )

    if body.is_default:
        previous_defaults = await db.execute(
            select(AgentProfile).where(
                AgentProfile.workspace_id == workspace.workspace_id,
                AgentProfile.deleted_at.is_(None),
                AgentProfile.is_default.is_(True),
            )
        )
        for previous in previous_defaults.scalars().all():
            previous.is_default = False

    db.add(agent)
    await db.commit()
    await db.refresh(agent)
    return SyncAgentOut.model_validate(agent)


@router.get("/agents/{agent_id}", response_model=SyncAgentOut)
async def get_agent(
    agent_id: uuid.UUID,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> SyncAgentOut:
    result = await db.execute(
        select(AgentProfile).where(
            AgentProfile.id == agent_id,
            AgentProfile.workspace_id == workspace.workspace_id,
            AgentProfile.deleted_at.is_(None),
        )
    )
    agent = result.scalar_one_or_none()
    if agent is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
    return SyncAgentOut.model_validate(agent)


@router.patch("/agents/{agent_id}", response_model=SyncAgentOut)
async def patch_agent(
    agent_id: uuid.UUID,
    body: SyncPatchAgentRequest,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> SyncAgentOut:
    result = await db.execute(
        select(AgentProfile).where(
            AgentProfile.id == agent_id,
            AgentProfile.workspace_id == workspace.workspace_id,
            AgentProfile.deleted_at.is_(None),
        )
    )
    agent = result.scalar_one_or_none()
    if agent is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")

    for field in [
        "name",
        "description",
        "prompt_mode",
        "prompt_instructions",
        "tool_policy_json",
        "memory_scope_json",
        "is_default",
        "is_active",
    ]:
        value = getattr(body, field)
        if value is not None:
            setattr(agent, field, value)

    if body.is_default is True:
        previous_defaults = await db.execute(
            select(AgentProfile).where(
                AgentProfile.workspace_id == workspace.workspace_id,
                AgentProfile.id != agent.id,
                AgentProfile.deleted_at.is_(None),
                AgentProfile.is_default.is_(True),
            )
        )
        for previous in previous_defaults.scalars().all():
            previous.is_default = False

    await db.commit()
    await db.refresh(agent)
    return SyncAgentOut.model_validate(agent)


@router.post("/agents/{agent_id}/versions/publish", response_model=SyncPublishAgentVersionResponse)
async def publish_agent_version(
    agent_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> SyncPublishAgentVersionResponse:
    result = await db.execute(
        select(AgentProfile).where(
            AgentProfile.id == agent_id,
            AgentProfile.workspace_id == workspace.workspace_id,
            AgentProfile.deleted_at.is_(None),
        )
    )
    agent = result.scalar_one_or_none()
    if agent is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")

    max_version_result = await db.execute(
        select(func.max(AgentProfileVersion.version)).where(
            AgentProfileVersion.agent_profile_id == agent.id,
            AgentProfileVersion.deleted_at.is_(None),
        )
    )
    next_version = (max_version_result.scalar() or 0) + 1

    now = datetime.now(UTC)
    snapshot = {
        "name": agent.name,
        "description": agent.description,
        "origin": agent.origin,
        "prompt_mode": agent.prompt_mode,
        "prompt_instructions": agent.prompt_instructions,
        "tool_policy_json": agent.tool_policy_json,
        "memory_scope_json": agent.memory_scope_json,
        "is_default": agent.is_default,
        "is_active": agent.is_active,
        "published_at": now.isoformat(),
    }
    version = AgentProfileVersion(
        agent_profile_id=agent.id,
        workspace_id=workspace.workspace_id,
        version=next_version,
        snapshot_json=snapshot,
        published_by_user_id=current_user.id,
        published_at=now,
    )
    db.add(version)
    agent.published_version = next_version
    await db.commit()

    return SyncPublishAgentVersionResponse(
        agent_id=agent.id,
        version=next_version,
        published_at=now,
    )


@router.get("/automations", response_model=SyncAutomationsResponse)
async def list_automations(
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> SyncAutomationsResponse:
    result = await db.execute(
        select(AutomationSpec)
        .where(
            AutomationSpec.workspace_id == workspace.workspace_id,
            AutomationSpec.deleted_at.is_(None),
        )
        .order_by(AutomationSpec.updated_at.desc())
    )
    automations = list(result.scalars().all())
    return SyncAutomationsResponse(
        automations=[SyncAutomationOut.model_validate(automation) for automation in automations]
    )


@router.post("/automations", response_model=SyncAutomationOut, status_code=status.HTTP_201_CREATED)
async def create_automation(
    body: SyncCreateAutomationRequest,
    current_user: User = Depends(get_current_user),
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> SyncAutomationOut:
    automation = AutomationSpec(
        workspace_id=workspace.workspace_id,
        created_by_user_id=current_user.id,
        name=body.name,
        description=body.description,
        spec_json=body.spec_json,
        status="draft",
        requires_confirm=body.requires_confirm,
    )
    db.add(automation)
    await db.commit()
    await db.refresh(automation)
    return SyncAutomationOut.model_validate(automation)


@router.patch("/automations/{automation_id}", response_model=SyncAutomationOut)
async def patch_automation(
    automation_id: uuid.UUID,
    body: SyncPatchAutomationRequest,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> SyncAutomationOut:
    result = await db.execute(
        select(AutomationSpec).where(
            AutomationSpec.id == automation_id,
            AutomationSpec.workspace_id == workspace.workspace_id,
            AutomationSpec.deleted_at.is_(None),
        )
    )
    automation = result.scalar_one_or_none()
    if automation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Automation not found")

    for field in ["name", "description", "spec_json", "requires_confirm"]:
        value = getattr(body, field)
        if value is not None:
            setattr(automation, field, value)

    await db.commit()
    await db.refresh(automation)
    return SyncAutomationOut.model_validate(automation)


@router.post("/automations/{automation_id}/validate", response_model=SyncValidateAutomationResponse)
async def validate_automation(
    automation_id: uuid.UUID,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> SyncValidateAutomationResponse:
    result = await db.execute(
        select(AutomationSpec).where(
            AutomationSpec.id == automation_id,
            AutomationSpec.workspace_id == workspace.workspace_id,
            AutomationSpec.deleted_at.is_(None),
        )
    )
    automation = result.scalar_one_or_none()
    if automation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Automation not found")

    errors: list[str] = []
    spec = automation.spec_json or {}
    if "trigger" not in spec:
        errors.append("Missing trigger in spec_json")
    if "actions" not in spec or not isinstance(spec.get("actions"), list):
        errors.append("Missing actions array in spec_json")

    automation.last_validated_at = datetime.now(UTC)
    await db.commit()

    return SyncValidateAutomationResponse(
        automation_id=automation.id,
        ok=len(errors) == 0,
        errors=errors,
    )


@router.post("/automations/{automation_id}/activate", response_model=SyncAutomationOut)
async def activate_automation(
    automation_id: uuid.UUID,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> SyncAutomationOut:
    result = await db.execute(
        select(AutomationSpec).where(
            AutomationSpec.id == automation_id,
            AutomationSpec.workspace_id == workspace.workspace_id,
            AutomationSpec.deleted_at.is_(None),
        )
    )
    automation = result.scalar_one_or_none()
    if automation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Automation not found")
    automation.status = "active"
    await db.commit()
    await db.refresh(automation)
    return SyncAutomationOut.model_validate(automation)


@router.post("/automations/{automation_id}/pause", response_model=SyncAutomationOut)
async def pause_automation(
    automation_id: uuid.UUID,
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> SyncAutomationOut:
    result = await db.execute(
        select(AutomationSpec).where(
            AutomationSpec.id == automation_id,
            AutomationSpec.workspace_id == workspace.workspace_id,
            AutomationSpec.deleted_at.is_(None),
        )
    )
    automation = result.scalar_one_or_none()
    if automation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Automation not found")
    automation.status = "paused"
    await db.commit()
    await db.refresh(automation)
    return SyncAutomationOut.model_validate(automation)
