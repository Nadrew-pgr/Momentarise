from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Any, Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.agent_profile import AgentProfile
from src.models.workspace import Workspace, WorkspaceMember


@dataclass(slots=True)
class EditorSubAgentContext:
    agent_id: uuid.UUID | None
    agent_name: str
    prompt_mode: Literal["editor_assistant"]
    prompt_instructions: str | None
    allowed_tools: list[dict[str, Any]]
    locale: str
    extra_system_prompt: str
    model: str


class EditorSubAgentRuntime:
    def __init__(
        self,
        *,
        db: AsyncSession,
        workspace_id: uuid.UUID,
        user_id: uuid.UUID,
        action: str,
        locale: str = "fr-FR",
    ) -> None:
        self.db = db
        self.workspace_id = workspace_id
        self.user_id = user_id
        self.action = action
        self.locale = locale

    async def _load_effective_preferences(self) -> dict[str, Any]:
        workspace_preferences: dict[str, Any] = {}
        workspace_result = await self.db.execute(
            select(Workspace).where(
                Workspace.id == self.workspace_id,
                Workspace.deleted_at.is_(None),
            )
        )
        workspace = workspace_result.scalar_one_or_none()
        if workspace and isinstance(workspace.preferences, dict):
            workspace_preferences = workspace.preferences

        member_preferences: dict[str, Any] = {}
        result = await self.db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == self.workspace_id,
                WorkspaceMember.user_id == self.user_id,
                WorkspaceMember.deleted_at.is_(None),
            )
        )
        member = result.scalar_one_or_none()
        if member and isinstance(member.preferences, dict):
            member_preferences = member.preferences

        merged = dict(workspace_preferences)
        merged.update(member_preferences)
        return merged

    @staticmethod
    def _extract_ai_preferences(preferences: dict[str, Any]) -> dict[str, Any]:
        raw = preferences.get("ai")
        return raw if isinstance(raw, dict) else {}

    @staticmethod
    def _parse_uuid(value: object) -> uuid.UUID | None:
        if not isinstance(value, str) or not value.strip():
            return None
        try:
            return uuid.UUID(value.strip())
        except ValueError:
            return None

    async def _resolve_agent_from_preferences(
        self,
        ai_preferences: dict[str, Any],
    ) -> AgentProfile | None:
        selected_agent_id = self._parse_uuid(ai_preferences.get("editor_default_agent_id"))

        routing_rules = ai_preferences.get("editor_agent_routing_rules")
        if isinstance(routing_rules, dict):
            by_action = routing_rules.get("by_action")
            if isinstance(by_action, dict):
                routed = self._parse_uuid(by_action.get(self.action))
                if routed is not None:
                    selected_agent_id = routed

        if selected_agent_id is None:
            return None

        result = await self.db.execute(
            select(AgentProfile).where(
                AgentProfile.id == selected_agent_id,
                AgentProfile.workspace_id == self.workspace_id,
                AgentProfile.deleted_at.is_(None),
                AgentProfile.is_active.is_(True),
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    def _build_extra_system_prompt(action: str) -> str:
        return (
            "You are in editor_assistant mode. "
            "Return a strict JSON object with key result_text. "
            "Preserve user intent and language unless translation is requested. "
            f"Requested action={action}."
        )

    async def build_context(self) -> EditorSubAgentContext:
        preferences = await self._load_effective_preferences()
        ai_preferences = self._extract_ai_preferences(preferences)
        agent = await self._resolve_agent_from_preferences(ai_preferences)
        model = str(ai_preferences.get("sync_model") or "auto")
        return EditorSubAgentContext(
            agent_id=agent.id if agent else None,
            agent_name=agent.name if agent else "Sync Editor Assistant",
            prompt_mode="editor_assistant",
            prompt_instructions=agent.prompt_instructions if agent else None,
            allowed_tools=[],
            locale=self.locale,
            extra_system_prompt=self._build_extra_system_prompt(self.action),
            model=model,
        )
