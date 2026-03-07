from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.models.agent_profile import AgentProfile
from src.models.inbox_capture import InboxCapture
from src.models.workspace import Workspace, WorkspaceMember
from src.sync.tool_registry import get_default_tools


@dataclass(slots=True)
class CaptureSubAgentContext:
    agent_id: uuid.UUID | None
    agent_name: str
    mode: str
    prompt_mode: str
    prompt_instructions: str | None
    modules: list[str]
    allowed_tools: list[dict[str, Any]]
    user_timezone: str | None
    locale: str
    extra_system_prompt: str


class CaptureSubAgentRuntime:
    def __init__(
        self,
        *,
        db: AsyncSession,
        capture: InboxCapture,
        metadata: dict[str, Any] | None = None,
        locale: str = "fr-FR",
    ) -> None:
        self.db = db
        self.capture = capture
        self.metadata = metadata or {}
        self.locale = locale

    async def _load_effective_preferences(self) -> dict[str, Any]:
        workspace_preferences: dict[str, Any] = {}
        workspace_result = await self.db.execute(
            select(Workspace).where(
                Workspace.id == self.capture.workspace_id,
                Workspace.deleted_at.is_(None),
            )
        )
        workspace = workspace_result.scalar_one_or_none()
        if workspace and isinstance(workspace.preferences, dict):
            workspace_preferences = workspace.preferences

        member_preferences: dict[str, Any] = {}
        result = await self.db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == self.capture.workspace_id,
                WorkspaceMember.user_id == self.capture.user_id,
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
        if not settings.CAPTURE_SUBAGENT_ROUTING_ENABLED:
            return None

        selected_agent_id: uuid.UUID | None = None
        routing_rules = ai_preferences.get("capture_agent_routing_rules")
        if isinstance(routing_rules, dict):
            by_capture_type = routing_rules.get("by_capture_type")
            if isinstance(by_capture_type, dict):
                selected_agent_id = self._parse_uuid(by_capture_type.get(self.capture.capture_type))

            if selected_agent_id is None:
                by_source = routing_rules.get("by_source")
                if isinstance(by_source, dict):
                    selected_agent_id = self._parse_uuid(by_source.get(self.capture.source or ""))

            # Backward compatibility for legacy rules shape.
            if selected_agent_id is None:
                by_source_type = routing_rules.get("by_source_type")
                if isinstance(by_source_type, dict):
                    selected_agent_id = self._parse_uuid(by_source_type.get(self.capture.capture_type))
            if selected_agent_id is None:
                by_source_type = routing_rules.get("by_source_type")
                if isinstance(by_source_type, dict):
                    selected_agent_id = self._parse_uuid(by_source_type.get(self.capture.source or ""))

        if selected_agent_id is None:
            selected_agent_id = self._parse_uuid(ai_preferences.get("capture_default_agent_id"))

        if selected_agent_id is None:
            return None

        result = await self.db.execute(
            select(AgentProfile).where(
                AgentProfile.id == selected_agent_id,
                AgentProfile.workspace_id == self.capture.workspace_id,
                AgentProfile.deleted_at.is_(None),
                AgentProfile.is_active.is_(True),
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    def _build_modules(mode: str) -> list[str]:
        modules = ["intent", "calendar", "conflicts", "travel", "memory", "safety", "policy"]
        if mode == "preview_plan":
            modules.append("preview")
        if settings.CAPTURE_CONTEXT_ENRICHMENT_ENABLED:
            modules.append("context_retrieval")
        if settings.CAPTURE_WEB_RESEARCH_ENABLED:
            modules.append("web_research")
        return modules

    @staticmethod
    def _build_allowed_tools(mode: str) -> list[dict[str, Any]]:
        read_only_tools = {
            "memory_search",
            "calendar_events_range",
            "calendar_preferences_get",
            "calendar_patterns_suggest",
            "travel_estimate",
        }
        preview_tools = {
            "item_preview",
            "event_preview",
            "inbox_transform_preview",
        }
        allowed_tool_names = set(read_only_tools)
        if mode == "preview_plan":
            allowed_tool_names.update(preview_tools)

        return [
            {
                "name": tool.name,
                "description": tool.description,
                "requires_confirm": False,
                "is_write": tool.is_write,
            }
            for tool in get_default_tools()
            if tool.name in allowed_tool_names
        ]

    def _build_user_timezone(self) -> str | None:
        raw = self.metadata.get("timezone")
        if isinstance(raw, str) and raw.strip():
            return raw.strip()
        return None

    @staticmethod
    def _build_extra_system_prompt(ai_preferences: dict[str, Any], *, mode: str) -> str:
        research_policy = str(ai_preferences.get("capture_research_policy") or "proposal_only")
        if mode == "summary_generation":
            return (
                "Return a JSON object with keys: title, summary, description, key_points, missing_fields. "
                "title must be short and actionable. "
                "summary must be concise and concrete. description can be 2-4 short sentences. "
                "missing_fields must list critical unknowns for downstream actions. "
                "Never mutate data directly. "
                f"Research policy={research_policy}."
            )
        if mode == "preview_plan":
            return (
                "Return a JSON object with keys: action_key, action_type, suggested_title, suggested_kind, "
                "confidence, reason, preview_payload, missing_fields. "
                "preview_payload must be safe and ready for review/apply. "
                "Never mutate data directly. "
                f"Research policy={research_policy}."
            )
        return (
            "Return a JSON object with keys: normalized_facts, questions_if_needed, action_candidates. "
            "action_candidates must use types in: create_event|create_task|create_item|draft_reply|pay_invoice|review. "
            "Never mutate data directly. Propose only safe downstream actions. "
            f"Research policy={research_policy}."
        )

    async def build_context(self, *, mode: str) -> CaptureSubAgentContext:
        normalized_mode = mode if mode in {"summary_generation", "suggest_actions", "preview_plan"} else "suggest_actions"
        preferences = await self._load_effective_preferences()
        ai_preferences = self._extract_ai_preferences(preferences)
        agent = await self._resolve_agent_from_preferences(ai_preferences)
        return CaptureSubAgentContext(
            agent_id=agent.id if agent else None,
            agent_name=agent.name if agent else "Sync Capture Analyst",
            mode=normalized_mode,
            prompt_mode="capture_analysis",
            prompt_instructions=agent.prompt_instructions if agent else None,
            modules=self._build_modules(normalized_mode),
            allowed_tools=self._build_allowed_tools(normalized_mode),
            user_timezone=self._build_user_timezone(),
            locale=self.locale,
            extra_system_prompt=self._build_extra_system_prompt(ai_preferences, mode=normalized_mode),
        )
