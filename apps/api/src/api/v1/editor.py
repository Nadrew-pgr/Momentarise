from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.deps import get_current_user, get_current_workspace
from src.models.user import User
from src.models.workspace import WorkspaceMember
from src.schemas.editor import (
    BlockNoteAssistRequest,
    BlockNoteAssistResponse,
    EditorAssistRequest,
    EditorAssistResponse,
)
from src.services.editor_ai_service import (
    assist_editor_blocknote_with_subagent,
    assist_editor_with_subagent,
)

router = APIRouter(prefix="/editor", tags=["editor"])


@router.post("/assist", response_model=EditorAssistResponse)
async def editor_assist(
    body: EditorAssistRequest,
    current_user: User = Depends(get_current_user),
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> EditorAssistResponse:
    payload = await assist_editor_with_subagent(
        db=db,
        workspace_id=workspace.workspace_id,
        user_id=current_user.id,
        action=body.action,
        text=body.text,
        selection_text=body.selection_text,
        locale=body.locale,
        target_language=body.target_language,
        context=body.context,
    )
    return EditorAssistResponse.model_validate(payload)


@router.post("/assist/blocknote", response_model=BlockNoteAssistResponse)
async def editor_assist_blocknote(
    body: BlockNoteAssistRequest,
    current_user: User = Depends(get_current_user),
    workspace: WorkspaceMember = Depends(get_current_workspace),
    db: AsyncSession = Depends(get_db),
) -> BlockNoteAssistResponse:
    payload = await assist_editor_blocknote_with_subagent(
        db=db,
        workspace_id=workspace.workspace_id,
        user_id=current_user.id,
        messages=body.messages,
        tool_definitions=body.tool_definitions,
        locale=body.locale,
        context=body.context,
    )
    return BlockNoteAssistResponse.model_validate(payload)
