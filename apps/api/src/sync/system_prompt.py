from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Literal

PromptMode = Literal["full", "minimal", "none"]


@dataclass(slots=True)
class SystemPromptParams:
    agent_name: str | None
    prompt_mode: PromptMode
    user_message: str
    allowed_tools: list[dict]
    retrieval_snippets: list[dict]
    workspace_name: str = "current workspace"
    extra_system_prompt: str | None = None
    workspace_notes: list[str] | None = None
    user_timezone: str | None = None
    runtime_info: dict[str, str | None] | None = None


def _clean(value: str | None) -> str:
    return (value or "").strip()


def _normalize_mode(mode: str) -> PromptMode:
    if mode in {"full", "minimal", "none"}:
        return mode  # type: ignore[return-value]
    return "full"


def _format_runtime_line(runtime_info: dict[str, str | None] | None) -> str:
    info = runtime_info or {}
    parts = [
        f"agent={_clean(info.get('agent'))}" if _clean(info.get("agent")) else "",
        f"mode={_clean(info.get('mode'))}" if _clean(info.get("mode")) else "",
        f"status={_clean(info.get('status'))}" if _clean(info.get("status")) else "",
        f"model={_clean(info.get('model'))}" if _clean(info.get("model")) else "",
    ]
    compact = " | ".join([part for part in parts if part])
    return compact or "mode=guided"


def _build_tools_section(allowed_tools: list[dict]) -> list[str]:
    lines = [
        "## Tooling",
        "Use only declared tools. Never execute writes without preview/apply confirmation.",
    ]

    if not allowed_tools:
        lines.append("- No tools declared for this run.")
        lines.append("")
        return lines

    for tool in allowed_tools:
        name = _clean(str(tool.get("name") or "tool"))
        description = _clean(str(tool.get("description") or ""))
        requires_confirm = bool(tool.get("requires_confirm"))
        is_write = bool(tool.get("is_write"))

        flags = []
        if is_write:
            flags.append("write")
        else:
            flags.append("read")
        if requires_confirm:
            flags.append("confirm")

        suffix = f" ({', '.join(flags)})" if flags else ""
        line = f"- {name}{suffix}"
        if description:
            line += f": {description}"
        lines.append(line)

    lines.append("")
    return lines


def _build_safety_section() -> list[str]:
    return [
        "## Safety",
        "- Preview-first policy: propose change -> emit preview -> wait for apply.",
        "- Never claim an apply succeeded unless an applied event exists.",
        "- On uncertainty, ask a clarifying question before suggesting a mutation.",
        "- Do not fabricate tool outputs, ids, or external facts.",
        "",
    ]


def _build_reply_contract_section() -> list[str]:
    return [
        "## Reply Contract",
        "- Keep answers concise and actionable.",
        "- If user asks for a plan, provide numbered steps.",
        "- If context is insufficient, ask one direct question.",
        "- Use markdown only when it improves readability.",
        "",
    ]


def _build_memory_section(retrieval_snippets: list[dict]) -> list[str]:
    lines = [
        "## Memory Recall",
        "Use retrieved snippets as hints; prefer explicit user instruction when conflicts appear.",
    ]

    if not retrieval_snippets:
        lines.append("- No snippets were retrieved for this turn.")
        lines.append("")
        return lines

    for index, snippet in enumerate(retrieval_snippets, start=1):
        chunk_id = _clean(str(snippet.get("chunk_id") or ""))
        chunk_text = _clean(str(snippet.get("chunk_text") or ""))
        compact_text = " ".join(chunk_text.split())
        if len(compact_text) > 220:
            compact_text = f"{compact_text[:217]}..."

        label = f"snippet_{index}"
        if chunk_id:
            label = f"{label}:{chunk_id}"

        if compact_text:
            lines.append(f"- {label} => {compact_text}")
        else:
            lines.append(f"- {label} => (empty)")

    lines.append("")
    return lines


def _build_workspace_section(params: SystemPromptParams) -> list[str]:
    lines = [
        "## Workspace",
        f"Current workspace scope: {params.workspace_name}.",
        "Treat all operations as workspace-scoped and auditable.",
    ]

    for note in params.workspace_notes or []:
        cleaned = _clean(note)
        if cleaned:
            lines.append(f"- {cleaned}")

    lines.append("")
    return lines


def _build_time_section(user_timezone: str | None) -> list[str]:
    if not _clean(user_timezone):
        return []

    now_utc = datetime.now(UTC).isoformat()
    return [
        "## Current Time",
        f"User timezone: {_clean(user_timezone)}",
        f"UTC now: {now_utc}",
        "",
    ]


def _build_runtime_section(runtime_info: dict[str, str | None] | None) -> list[str]:
    return [
        "## Runtime",
        _format_runtime_line(runtime_info),
        "",
    ]


def _build_context_section(extra_system_prompt: str | None) -> list[str]:
    text = _clean(extra_system_prompt)
    if not text:
        return []

    return ["## Extra Context", text, ""]


def build_agent_system_prompt(params: SystemPromptParams) -> str:
    mode = _normalize_mode(params.prompt_mode)
    agent_name = _clean(params.agent_name) or "Sync"

    if mode == "none":
        return f"You are {agent_name}, a workspace assistant."

    lines = [
        f"You are {agent_name}, a reliable workspace assistant.",
        "Primary goal: help the user plan and apply safe workspace changes.",
        "",
    ]

    lines.extend(_build_tools_section(params.allowed_tools))
    lines.extend(_build_workspace_section(params))
    lines.extend(_build_runtime_section(params.runtime_info))

    if mode == "full":
        lines.extend(_build_safety_section())
        lines.extend(_build_reply_contract_section())
        lines.extend(_build_memory_section(params.retrieval_snippets))
        lines.extend(_build_time_section(params.user_timezone))
        lines.extend(_build_context_section(params.extra_system_prompt))

    return "\n".join([line for line in lines if line is not None]).strip()
