from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.services.editor_subagent_runtime import EditorSubAgentRuntime
from src.sync.litellm_client import LiteLLMClient
from src.sync.prompt_composer import PromptComposer, PromptComposerInput


def _fallback_result(action: str, text: str) -> str:
    clean = text.strip()
    if not clean:
        return ""
    if action == "shorter":
        target = max(40, int(len(clean) * 0.7))
        return clean[:target].strip()
    if action == "longer":
        return f"{clean}\n\nDétail complémentaire: clarifier le contexte, la contrainte, et l'objectif."
    if action == "summarize":
        return clean.splitlines()[0][:240]
    return clean


def _extract_ui_message_text(message: dict[str, Any]) -> str:
    parts = message.get("parts")
    if isinstance(parts, list):
        text_chunks: list[str] = []
        for part in parts:
            if not isinstance(part, dict):
                continue
            if str(part.get("type") or "") == "text":
                chunk = part.get("text")
                if isinstance(chunk, str) and chunk.strip():
                    text_chunks.append(chunk.strip())
        if text_chunks:
            return "\n".join(text_chunks).strip()
    content = message.get("content")
    if isinstance(content, str):
        return content.strip()
    return ""


def _ui_messages_to_litellm_messages(messages: list[dict[str, Any]]) -> list[dict[str, str]]:
    mapped: list[dict[str, str]] = []
    for message in messages:
        if not isinstance(message, dict):
            continue
        role = str(message.get("role") or "user").strip().lower()
        if role not in {"system", "user", "assistant", "tool"}:
            role = "user"
        content = _extract_ui_message_text(message)
        metadata = message.get("metadata")
        if isinstance(metadata, dict):
            document_state = metadata.get("documentState")
            if document_state is not None and role in {"user", "system"}:
                state_json = json.dumps(document_state, ensure_ascii=True)
                if content:
                    content = f"{content}\n\nDocument state:\n{state_json}"
                else:
                    content = f"Document state:\n{state_json}"
        if not content:
            continue
        mapped.append({"role": role, "content": content})
    return mapped


def _tool_definitions_to_litellm_tools(
    tool_definitions: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    tools: list[dict[str, Any]] = []
    for name, definition in tool_definitions.items():
        tool_name = str(name or "").strip()
        if not tool_name:
            continue
        if not isinstance(definition, dict):
            continue
        description_raw = definition.get("description")
        description = description_raw.strip() if isinstance(description_raw, str) else ""
        input_schema = definition.get("inputSchema")
        if not isinstance(input_schema, dict):
            input_schema = {"type": "object", "properties": {}}
        tools.append(
            {
                "type": "function",
                "function": {
                    "name": tool_name,
                    "description": description,
                    "parameters": input_schema,
                },
            }
        )
    return tools


def _pick_tool_call(tool_calls: Any) -> dict[str, Any] | None:
    if not isinstance(tool_calls, list) or not tool_calls:
        return None
    selected: dict[str, Any] | None = None
    for entry in tool_calls:
        if not isinstance(entry, dict):
            continue
        if str(entry.get("name") or "") == "applyDocumentOperations":
            selected = entry
            break
        if selected is None:
            selected = entry
    if not isinstance(selected, dict):
        return None
    tool_id = str(selected.get("id") or "tool_call")
    name = str(selected.get("name") or "applyDocumentOperations")
    arguments = selected.get("arguments")
    if isinstance(arguments, str):
        try:
            parsed = json.loads(arguments)
            arguments = parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            arguments = {}
    if not isinstance(arguments, dict):
        arguments = {}
    return {"id": tool_id, "name": name, "input": arguments}


async def assist_editor_with_subagent(
    *,
    db: AsyncSession,
    workspace_id,
    user_id,
    action: str,
    text: str,
    selection_text: str | None = None,
    locale: str = "fr-FR",
    target_language: str | None = None,
    context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    runtime = EditorSubAgentRuntime(
        db=db,
        workspace_id=workspace_id,
        user_id=user_id,
        action=action,
        locale=locale,
    )
    agent_context = await runtime.build_context()
    input_text = selection_text.strip() if isinstance(selection_text, str) and selection_text.strip() else text.strip()

    user_message = (
        f"Action: {action}\n"
        f"Locale: {locale}\n"
        f"Target language: {target_language or ''}\n"
        f"Context: {json.dumps(context or {}, ensure_ascii=True)}\n"
        f"Input text:\n{input_text}\n\n"
        "Return only valid JSON."
    )
    system_prompt, retrieval_snapshot, toolset_snapshot = PromptComposer.compose(
        PromptComposerInput(
            agent_name=agent_context.agent_name,
            prompt_mode=agent_context.prompt_mode,
            user_message=user_message,
            retrieval_snippets=[],
            allowed_tools=[],
            extra_system_prompt=agent_context.extra_system_prompt,
            locale=locale,
            user_now=datetime.now(UTC),
            runtime_info={
                "agent": str(agent_context.agent_id) if agent_context.agent_id else "editor_assist",
                "mode": "editor_assist",
                "status": "active",
                "model": settings.SYNC_MODEL_SMALL,
            },
        )
    )

    last_error: Exception | None = None
    for model in [settings.SYNC_MODEL_SMALL, settings.SYNC_MODEL_BALANCED]:
        try:
            result = await LiteLLMClient.complete(
                prompt=system_prompt,
                user_message=user_message,
                model=model,
            )
            content = str(result.get("content") or "").strip()
            payload = json.loads(content) if content else {}
            output_text = (
                str(payload.get("result_text") or "").strip()
                if isinstance(payload, dict)
                else ""
            )
            if not output_text:
                output_text = _fallback_result(action, input_text)
            return {
                "result_text": output_text,
                "agent_id": str(agent_context.agent_id) if agent_context.agent_id else None,
                "agent_name": agent_context.agent_name,
                "model": str(result.get("model") or model),
                "fallback_used": False,
                "prompt_snapshot": system_prompt,
                "toolset_snapshot": toolset_snapshot,
                "retrieval_snapshot": retrieval_snapshot,
            }
        except Exception as exc:  # noqa: BLE001
            last_error = exc

    return {
        "result_text": _fallback_result(action, input_text),
        "agent_id": str(agent_context.agent_id) if agent_context.agent_id else None,
        "agent_name": agent_context.agent_name,
        "model": settings.SYNC_MODEL_SMALL,
        "fallback_used": True,
        "prompt_snapshot": system_prompt + ("\n\nFallback: " + str(last_error) if last_error else ""),
        "toolset_snapshot": toolset_snapshot,
        "retrieval_snapshot": retrieval_snapshot,
    }


async def assist_editor_blocknote_with_subagent(
    *,
    db: AsyncSession,
    workspace_id,
    user_id,
    messages: list[dict[str, Any]],
    tool_definitions: dict[str, dict[str, Any]],
    locale: str = "fr-FR",
    context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    requested_action = str((context or {}).get("action") or "rewrite")
    runtime = EditorSubAgentRuntime(
        db=db,
        workspace_id=workspace_id,
        user_id=user_id,
        action=requested_action,
        locale=locale,
    )
    agent_context = await runtime.build_context()
    model_messages = _ui_messages_to_litellm_messages(messages)
    toolset = _tool_definitions_to_litellm_tools(tool_definitions)
    last_user_message = ""
    for message in reversed(model_messages):
        if message.get("role") == "user":
            last_user_message = str(message.get("content") or "").strip()
            break
    user_message = last_user_message or "Apply the requested editor transformation."
    composed_extra_context = (
        f"{agent_context.extra_system_prompt}\n"
        "You are connected to BlockNote AI tools.\n"
        "You MUST call the tool `applyDocumentOperations` to apply changes.\n"
        "Do not return plain-text-only answers."
    )
    allowed_tools = [
        {"name": str(tool.get("function", {}).get("name", ""))}
        for tool in toolset
        if isinstance(tool, dict)
    ]
    system_prompt, retrieval_snapshot, toolset_snapshot = PromptComposer.compose(
        PromptComposerInput(
            agent_name=agent_context.agent_name,
            prompt_mode=agent_context.prompt_mode,
            user_message=user_message,
            retrieval_snippets=[],
            allowed_tools=allowed_tools,
            extra_system_prompt=composed_extra_context,
            locale=locale,
            user_now=datetime.now(UTC),
            runtime_info={
                "agent": str(agent_context.agent_id) if agent_context.agent_id else "editor_assist",
                "mode": "editor_assist_blocknote",
                "status": "active",
                "model": settings.SYNC_MODEL_SMALL,
            },
        )
    )
    llm_messages = [{"role": "system", "content": system_prompt}, *model_messages]
    last_error: Exception | None = None
    for model in [settings.SYNC_MODEL_SMALL, settings.SYNC_MODEL_BALANCED]:
        try:
            result = await LiteLLMClient.complete(
                prompt=system_prompt,
                user_message=user_message,
                model=model,
                messages=llm_messages,
                tools=toolset,
                tool_choice="required" if toolset else None,
            )
            tool_call = _pick_tool_call(result.get("tool_calls"))
            content = str(result.get("content") or "").strip()
            return {
                "tool_call": tool_call,
                "result_text": content or None,
                "model": str(result.get("model") or model),
                "fallback_used": False,
                "prompt_snapshot": system_prompt,
                "toolset_snapshot": toolset_snapshot,
                "retrieval_snapshot": retrieval_snapshot,
            }
        except Exception as exc:  # noqa: BLE001
            last_error = exc

    return {
        "tool_call": None,
        "result_text": None,
        "model": settings.SYNC_MODEL_SMALL,
        "fallback_used": True,
        "prompt_snapshot": system_prompt + ("\n\nFallback: " + str(last_error) if last_error else ""),
        "toolset_snapshot": toolset_snapshot,
        "retrieval_snapshot": retrieval_snapshot,
    }
