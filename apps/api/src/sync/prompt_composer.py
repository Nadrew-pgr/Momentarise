from dataclasses import dataclass
from datetime import datetime
from typing import Literal

from src.sync.system_prompt import SystemPromptParams, build_agent_system_prompt

PromptMode = Literal["full", "minimal", "none", "capture_analysis", "editor_assistant"]


@dataclass(slots=True)
class PromptComposerInput:
    agent_name: str | None
    prompt_mode: PromptMode
    user_message: str
    retrieval_snippets: list[dict]
    allowed_tools: list[dict]
    extra_system_prompt: str | None = None
    workspace_notes: list[str] | None = None
    user_timezone: str | None = None
    user_now: datetime | None = None
    locale: str | None = None
    runtime_info: dict[str, str | None] | None = None


class PromptComposer:
    """Compose deterministic system prompt snapshots for auditability."""

    MAX_SNIPPETS = 5

    @classmethod
    def compose(cls, data: PromptComposerInput) -> tuple[str, list[dict], list[str]]:
        snippets = data.retrieval_snippets[: cls.MAX_SNIPPETS]
        tool_names = [str(tool.get("name")) for tool in data.allowed_tools if str(tool.get("name") or "").strip()]

        system_prompt = build_agent_system_prompt(
            SystemPromptParams(
                agent_name=data.agent_name,
                prompt_mode=data.prompt_mode,
                user_message=data.user_message,
                allowed_tools=data.allowed_tools,
                retrieval_snippets=snippets,
                extra_system_prompt=data.extra_system_prompt,
                workspace_notes=data.workspace_notes,
                user_timezone=data.user_timezone,
                user_now=data.user_now,
                locale=data.locale,
                runtime_info=data.runtime_info,
            )
        )

        return system_prompt, snippets, tool_names
