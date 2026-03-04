from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

PromptMode = Literal["full", "minimal", "none", "capture_analysis"]


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
    user_now: datetime | None = None
    locale: str | None = None
    runtime_info: dict[str, str | None] | None = None


def _clean(value: str | None) -> str:
    return (value or "").strip()


def _normalize_mode(mode: str) -> PromptMode:
    if mode in {"full", "minimal", "none", "capture_analysis"}:
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
        "When the user asks to create, update, plan, or change something in the workspace, you MUST call one of the preview tools (item_preview, event_preview, inbox_transform_preview) so a structured preview card is shown. Replying only in text for such intents is not allowed.",
        "The plan is the structured preview card (with Apply/Cancel) that appears when you call a preview tool. You must call the tool so this card is shown; do not only describe the change in plain text.",
        "When calling preview tools (item_preview, event_preview, inbox_transform_preview), always pass display_summary with the same user-facing text you would put in your reply for that change: event title, schedule (e.g. \"Horaire : 09:00 - 09:30 (30 min)\"), color in user language, and a short description if relevant. This text is shown in the plan card instead of raw parameters.",
        "CRITICAL: Your text reply before a preview tool call MUST be at most 1-2 sentences. Call the preview tool IMMEDIATELY. Do NOT describe the event/item details in your reply — those details belong ONLY in the tool call arguments and display_summary.",
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
        "- Ask at most one blocking clarification question when critical data is missing.",
        "- Do not fabricate tool outputs, ids, or external facts.",
        "",
    ]


def _build_autonomous_policy_section() -> list[str]:
    return [
        "## Autonomous Planning Policy",
        "- Infer missing defaults when safe (title, duration, color, scheduling window).",
        "- Do not ask for fields that can be inferred from context, memory, or preferences.",
        "- For planning/scheduling/edit intents, proactively call preview tools before replying (`event_preview`, `item_preview`, `inbox_transform_preview`).",
        "- Do NOT describe planned changes or steps in plain text only. Always emit a structured preview via the preview tools so the user gets a preview card with Apply/Cancel.",
        "- Output format for mutation intents: 1 short sentence intro → tool call. No bullet lists. No markdown headers. No detailed prose.",
        "- Avoid long questionnaires: ask at most one blocking question only when a critical field cannot be inferred.",
        "- Resolve relative dates/times into absolute datetimes with timezone in outputs.",
        "- If assumptions are made, state them briefly and proceed with preview-first execution.",
        "",
    ]


def _build_reply_contract_section() -> list[str]:
    return [
        "## Reply Contract",
        "- Keep answers concise and actionable.",
        "- Use the user's own words and correct spelling; do not merge or invent words (e.g. write \"ma journée\" not \"manjournée\", \"ma semaine\" not \"masemaine\").",
        "- Do not output a plan or list of steps as plain text when the user wants to apply changes; use the preview tools instead so a structured preview card is shown.",
        "- NEVER list event/item details (title, time, color, description, etc.) as prose when a preview tool exists. Those details belong ONLY inside the tool call arguments and display_summary.",
        "- If the user only asks for an explanation (no mutation), you may reply in text.",
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


def _build_time_section(user_timezone: str | None, user_now: datetime | None, locale: str | None) -> list[str]:
    timezone_name = _clean(user_timezone) or "UTC"
    now_utc_dt = user_now.astimezone(UTC) if user_now is not None else datetime.now(UTC)
    try:
        local_zone = ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError:
        local_zone = UTC
        timezone_name = "UTC"
    local_now = now_utc_dt.astimezone(local_zone)
    now_utc = now_utc_dt.isoformat()
    local_iso = local_now.isoformat()
    local_weekday = local_now.strftime("%A")
    local_date = local_now.strftime("%Y-%m-%d")
    local_time = local_now.strftime("%H:%M")
    return [
        "## Current Time",
        f"User timezone: {timezone_name}",
        f"Locale: {_clean(locale) or 'fr-FR'}",
        f"Today in user timezone: {local_date} ({local_weekday})",
        f"Current local time: {local_time}",
        f"Local datetime ISO: {local_iso}",
        f"UTC now: {now_utc}",
        "Use these values as ground truth for all date/time reasoning.",
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

    if mode == "capture_analysis":
        lines.extend(_build_safety_section())
        lines.extend(
            [
                "## Capture Analysis Contract",
                "- You are analyzing an inbox capture and proposing action candidates.",
                "- Output must be strict JSON with keys: normalized_facts, questions_if_needed, action_candidates.",
                "- Never mutate data directly.",
                "",
            ]
        )
        lines.extend(_build_time_section(params.user_timezone, params.user_now, params.locale))
        lines.extend(_build_context_section(params.extra_system_prompt))
        return "\n".join([line for line in lines if line is not None]).strip()

    if mode == "full":
        lines.extend(_build_safety_section())
        lines.extend(_build_autonomous_policy_section())
        lines.extend(_build_reply_contract_section())
        lines.extend(_build_memory_section(params.retrieval_snippets))
        lines.extend(_build_time_section(params.user_timezone, params.user_now, params.locale))
        lines.extend(_build_context_section(params.extra_system_prompt))

    return "\n".join([line for line in lines if line is not None]).strip()
