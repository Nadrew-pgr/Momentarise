import asyncio
import json
import uuid
from dataclasses import dataclass
from typing import Any

import httpx

from src.core.config import settings


@dataclass(slots=True)
class LiteLLMClientError(Exception):
    message: str
    code: str = "llm_error"
    retryable: bool = False

    def __str__(self) -> str:
        return self.message


class _ProviderAdapter:
    provider: str
    endpoint: str

    def get_api_key(self) -> str | None:
        raise NotImplementedError

    def build_headers(self, api_key: str) -> dict[str, str]:
        raise NotImplementedError

    def build_payload(
        self,
        *,
        model: str,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None,
    ) -> dict[str, Any]:
        raise NotImplementedError

    def parse_response(self, data: dict[str, Any], model: str) -> dict[str, Any]:
        raise NotImplementedError


class _OpenAILikeAdapter(_ProviderAdapter):
    def build_payload(
        self,
        *,
        model: str,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": 0.2,
        }
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"
        return payload

    def parse_response(self, data: dict[str, Any], model: str) -> dict[str, Any]:
        choices = data.get("choices")
        if not isinstance(choices, list) or not choices:
            raise LiteLLMClientError(
                message=f"No choices returned by {self.provider}.",
                code="empty_choice",
                retryable=True,
            )

        first_choice = choices[0] if isinstance(choices[0], dict) else {}
        message = first_choice.get("message") if isinstance(first_choice.get("message"), dict) else {}

        content = _extract_openai_like_content(message.get("content"))
        tool_calls = _extract_openai_like_tool_calls(message.get("tool_calls"))
        reasoning = _extract_reasoning_payload(message=message, response_json=data)
        sources = _extract_sources_payload(message=message, response_json=data)

        usage_raw = data.get("usage") if isinstance(data.get("usage"), dict) else {}
        usage = {
            "input_tokens": int(usage_raw.get("prompt_tokens") or usage_raw.get("input_tokens") or 0),
            "output_tokens": int(
                usage_raw.get("completion_tokens") or usage_raw.get("output_tokens") or 0
            ),
            "total_tokens": int(usage_raw.get("total_tokens") or 0),
            "cost_usd": None,
        }

        return {
            "content": content,
            "provider": self.provider,
            "model": model,
            "usage": usage,
            "tool_calls": tool_calls,
            "finish_reason": first_choice.get("finish_reason"),
            "warning": None,
            "reasoning": reasoning,
            "sources": sources,
        }


class _MistralAdapter(_OpenAILikeAdapter):
    provider = "mistral"
    endpoint = "https://api.mistral.ai/v1/chat/completions"

    def get_api_key(self) -> str | None:
        return settings.MISTRAL_API_KEY

    def build_headers(self, api_key: str) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }


class _OpenAIAdapter(_OpenAILikeAdapter):
    provider = "openai"
    endpoint = "https://api.openai.com/v1/chat/completions"

    def get_api_key(self) -> str | None:
        return settings.OPENAI_API_KEY

    def build_headers(self, api_key: str) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }


class _AnthropicAdapter(_ProviderAdapter):
    provider = "anthropic"
    endpoint = "https://api.anthropic.com/v1/messages"

    def get_api_key(self) -> str | None:
        return settings.ANTHROPIC_API_KEY

    def build_headers(self, api_key: str) -> dict[str, str]:
        return {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }

    def build_payload(
        self,
        *,
        model: str,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None,
    ) -> dict[str, Any]:
        system_messages, anthropic_messages = _convert_messages_for_anthropic(messages)
        payload: dict[str, Any] = {
            "model": model,
            "messages": anthropic_messages,
            "max_tokens": 1024,
            "system": "\n\n".join(system_messages) if system_messages else "",
        }

        anthropic_tools = _convert_tools_for_anthropic(tools)
        if anthropic_tools:
            payload["tools"] = anthropic_tools
            payload["tool_choice"] = {"type": "auto"}

        return payload

    def parse_response(self, data: dict[str, Any], model: str) -> dict[str, Any]:
        content_blocks = data.get("content") if isinstance(data.get("content"), list) else []

        text_parts: list[str] = []
        tool_calls: list[dict[str, Any]] = []
        reasoning_parts: list[str] = []
        for block in content_blocks:
            if not isinstance(block, dict):
                continue
            block_type = str(block.get("type") or "")
            if block_type == "text":
                text = block.get("text")
                if isinstance(text, str):
                    text_parts.append(text)
                continue
            if block_type == "thinking":
                thinking_text = block.get("thinking")
                if isinstance(thinking_text, str) and thinking_text.strip():
                    reasoning_parts.append(thinking_text.strip())
                continue
            if block_type == "tool_use":
                name = block.get("name")
                if not isinstance(name, str) or not name.strip():
                    continue
                block_input = block.get("input")
                arguments = block_input if isinstance(block_input, dict) else {}
                tool_calls.append(
                    {
                        "id": str(block.get("id") or uuid.uuid4()),
                        "name": name,
                        "arguments": arguments,
                    }
                )

        usage_raw = data.get("usage") if isinstance(data.get("usage"), dict) else {}
        input_tokens = int(usage_raw.get("input_tokens") or 0)
        output_tokens = int(usage_raw.get("output_tokens") or 0)
        usage = {
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": input_tokens + output_tokens,
            "cost_usd": None,
        }

        return {
            "content": "".join(text_parts).strip(),
            "provider": self.provider,
            "model": str(data.get("model") or model),
            "usage": usage,
            "tool_calls": tool_calls,
            "finish_reason": data.get("stop_reason"),
            "warning": None,
            "reasoning": {
                "summary": "Model reasoning",
                "content": "\n\n".join(reasoning_parts),
                "duration_ms": None,
            }
            if reasoning_parts
            else None,
            "sources": _extract_sources_payload(message={"citations": data.get("citations")}, response_json=data),
        }


class _GeminiAdapter(_OpenAILikeAdapter):
    provider = "gemini"
    endpoint = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"

    def get_api_key(self) -> str | None:
        return settings.GEMINI_API_KEY

    def build_headers(self, api_key: str) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }


class LiteLLMClient:
    """Provider gateway for Sync with pluggable adapters."""

    RETRYABLE_STATUS_CODES = {408, 409, 425, 429, 500, 502, 503, 504}
    PROVIDERS: dict[str, _ProviderAdapter] = {
        "mistral": _MistralAdapter(),
        "openai": _OpenAIAdapter(),
        "anthropic": _AnthropicAdapter(),
        "gemini": _GeminiAdapter(),
    }

    @classmethod
    async def complete(
        cls,
        *,
        prompt: str,
        user_message: str,
        model: str | None = None,
        messages: list[dict[str, Any]] | None = None,
        tools: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        provider, target_model = cls._resolve_provider_and_model(model)
        print(f"[SYNC-DEBUG] LLM routing: requested={model!r} → provider={provider!r}, model={target_model!r}", flush=True)
        request_messages = messages or [
            {"role": "system", "content": prompt},
            {"role": "user", "content": user_message},
        ]

        adapter = cls.PROVIDERS.get(provider)
        if adapter is None:
            warning = f"Unsupported SYNC_LLM_PROVIDER='{provider}', fallback enabled."
            if settings.SYNC_ENABLE_FALLBACK:
                return cls._fallback(
                    prompt=prompt,
                    user_message=user_message,
                    model=target_model,
                    warning=warning,
                )
            raise LiteLLMClientError(
                message=f"Unsupported provider '{provider}'.",
                code="provider_not_supported",
                retryable=False,
            )

        api_key = (adapter.get_api_key() or "").strip()
        if not api_key:
            warning = f"{adapter.provider.upper()} API key missing, fallback enabled."
            if settings.SYNC_ENABLE_FALLBACK:
                return cls._fallback(
                    prompt=prompt,
                    user_message=user_message,
                    model=target_model,
                    warning=warning,
                )
            raise LiteLLMClientError(
                message=f"{adapter.provider.upper()} API key is not configured.",
                code="missing_api_key",
                retryable=False,
            )

        payload = adapter.build_payload(model=target_model, messages=request_messages, tools=tools)
        headers = adapter.build_headers(api_key)

        try:
            response = await cls._post_with_retries(
                endpoint=adapter.endpoint,
                headers=headers,
                payload=payload,
                provider=adapter.provider,
            )
        except LiteLLMClientError as exc:
            print(f"[SYNC-DEBUG] POST error: {exc.message}", flush=True)
            if settings.SYNC_ENABLE_FALLBACK:
                return cls._fallback(
                    prompt=prompt,
                    user_message=user_message,
                    model=target_model,
                    warning=f"{exc.message} Fallback enabled.",
                )
            raise

        try:
            data = response.json()
        except ValueError as exc:
            print(f"[SYNC-DEBUG] JSON parse error from {adapter.provider}: {exc}", flush=True)
            warning = f"Invalid JSON from {adapter.provider}, fallback enabled."
            if settings.SYNC_ENABLE_FALLBACK:
                return cls._fallback(
                    prompt=prompt,
                    user_message=user_message,
                    model=target_model,
                    warning=warning,
                )
            raise LiteLLMClientError(
                message=f"Invalid JSON payload from {adapter.provider}.",
                code="invalid_provider_payload",
                retryable=True,
            ) from exc

        try:
            return adapter.parse_response(data, target_model)
        except LiteLLMClientError as exc:
            print(f"[SYNC-DEBUG] parse_response error: {exc.message}", flush=True)
            if settings.SYNC_ENABLE_FALLBACK:
                return cls._fallback(
                    prompt=prompt,
                    user_message=user_message,
                    model=target_model,
                    warning=f"{exc.message} Fallback enabled.",
                )
            raise

    @classmethod
    async def _post_with_retries(
        cls,
        *,
        endpoint: str,
        headers: dict[str, str],
        payload: dict[str, Any],
        provider: str,
    ) -> httpx.Response:
        timeout = httpx.Timeout(settings.SYNC_LLM_TIMEOUT_SECONDS)
        max_retries = max(0, int(settings.SYNC_LLM_MAX_RETRIES))

        attempt = 0
        while True:
            try:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    response = await client.post(endpoint, headers=headers, json=payload)
            except httpx.TimeoutException as exc:
                if attempt < max_retries:
                    attempt += 1
                    await cls._backoff(attempt)
                    continue
                raise LiteLLMClientError(
                    message=f"{provider} request timed out.",
                    code="timeout",
                    retryable=True,
                ) from exc
            except httpx.HTTPError as exc:
                if attempt < max_retries:
                    attempt += 1
                    await cls._backoff(attempt)
                    continue
                raise LiteLLMClientError(
                    message=f"{provider} network failure.",
                    code="network_error",
                    retryable=True,
                ) from exc

            if response.status_code >= 400:
                detail = cls._extract_error_detail(response)
                retryable = response.status_code in cls.RETRYABLE_STATUS_CODES
                if retryable and attempt < max_retries:
                    attempt += 1
                    await cls._backoff(attempt)
                    continue
                raise LiteLLMClientError(
                    message=f"{provider} error ({response.status_code}): {detail}",
                    code="provider_error",
                    retryable=retryable,
                )

            return response

    @staticmethod
    async def _backoff(attempt: int) -> None:
        await asyncio.sleep(min(0.25 * attempt, 1.0))

    @classmethod
    def _resolve_provider_and_model(cls, model: str | None) -> tuple[str, str]:
        configured_provider = (settings.SYNC_LLM_PROVIDER or "mistral").strip().lower()
        if configured_provider == "auto":
            configured_provider = "mistral"

        target_model = (model or settings.SYNC_MODEL_BALANCED or "mistral-medium-latest").strip()

        # 1. Explicit prefix like "gemini/gemini-3-flash" → split into provider + model
        if "/" in target_model:
            prefix, remainder = target_model.split("/", 1)
            normalized_prefix = prefix.strip().lower()
            if normalized_prefix in cls.PROVIDERS and remainder.strip():
                return normalized_prefix, remainder.strip()

        # 2. Look up provider from the model registry
        from src.sync.model_registry import get_model_entry
        entry = get_model_entry(target_model)
        if entry and entry.provider in cls.PROVIDERS:
            return entry.provider, target_model

        # 3. Fallback to configured provider
        return configured_provider, target_model

    @classmethod
    def _extract_error_detail(cls, response: httpx.Response) -> str:
        content_type = response.headers.get("content-type", "")
        if "application/json" in content_type:
            try:
                payload = response.json()
                if isinstance(payload, dict):
                    if isinstance(payload.get("error"), dict):
                        message = payload["error"].get("message")
                        if isinstance(message, str) and message.strip():
                            return message
                    detail = payload.get("detail")
                    if isinstance(detail, str) and detail.strip():
                        return detail
                    message = payload.get("message")
                    if isinstance(message, str) and message.strip():
                        return message
            except ValueError:
                pass

        text = response.text.strip()
        return text or "Unknown provider error"

    @classmethod
    def _fallback(
        cls,
        *,
        prompt: str,
        user_message: str,
        model: str,
        warning: str,
    ) -> dict[str, Any]:
        content = (
            "Understood. "
            f"I captured your request: {user_message.strip() or 'empty input'}. "
            "I can now propose a draft and a preview."
        )
        usage = {
            "input_tokens": max(1, len(prompt) // 4),
            "output_tokens": max(1, len(content) // 4),
            "total_tokens": max(2, (len(prompt) + len(content)) // 4),
            "cost_usd": 0,
        }
        return {
            "content": content,
            "provider": "fallback",
            "model": model or "local-sync-fallback",
            "usage": usage,
            "tool_calls": [],
            "finish_reason": "stop",
            "warning": warning,
            "reasoning": None,
            "sources": [],
        }


def _extract_openai_like_content(raw_content: Any) -> str:
    if isinstance(raw_content, str):
        return raw_content
    if not isinstance(raw_content, list):
        return ""

    parts: list[str] = []
    for block in raw_content:
        if isinstance(block, dict):
            text = block.get("text")
            if isinstance(text, str):
                parts.append(text)
    return "".join(parts)


def _extract_openai_like_tool_calls(raw_tool_calls: Any) -> list[dict[str, Any]]:
    tool_calls: list[dict[str, Any]] = []
    if not isinstance(raw_tool_calls, list):
        return tool_calls

    for entry in raw_tool_calls:
        if not isinstance(entry, dict):
            continue
        function = entry.get("function") if isinstance(entry.get("function"), dict) else {}
        name = function.get("name") if isinstance(function.get("name"), str) else ""
        if not name:
            continue

        raw_arguments = function.get("arguments")
        parsed_arguments: dict[str, Any] = {}
        if isinstance(raw_arguments, str) and raw_arguments.strip():
            try:
                decoded = json.loads(raw_arguments)
                if isinstance(decoded, dict):
                    parsed_arguments = decoded
            except json.JSONDecodeError:
                parsed_arguments = {"raw": raw_arguments}

        tool_calls.append(
            {
                "id": str(entry.get("id") or uuid.uuid4()),
                "name": name,
                "arguments": parsed_arguments,
            }
        )

    return tool_calls


def _extract_reasoning_payload(*, message: dict[str, Any], response_json: dict[str, Any]) -> dict[str, Any] | None:
    raw_reasoning = message.get("reasoning")
    if isinstance(raw_reasoning, str) and raw_reasoning.strip():
        return {
            "summary": "Model reasoning",
            "content": raw_reasoning.strip(),
            "duration_ms": None,
        }
    if isinstance(raw_reasoning, dict):
        summary = raw_reasoning.get("summary")
        content = raw_reasoning.get("content") or raw_reasoning.get("text")
        duration_ms = raw_reasoning.get("duration_ms")
        if not isinstance(summary, str):
            summary = None
        if not isinstance(content, str):
            content = None
        if isinstance(duration_ms, int) and duration_ms >= 0:
            normalized_duration_ms: int | None = duration_ms
        else:
            normalized_duration_ms = None
        if summary or content:
            return {
                "summary": summary,
                "content": content,
                "duration_ms": normalized_duration_ms,
            }

    content_blocks = message.get("content")
    if isinstance(content_blocks, list):
        reasoning_parts: list[str] = []
        for block in content_blocks:
            if not isinstance(block, dict):
                continue
            block_type = str(block.get("type") or "")
            if block_type not in {"reasoning", "thinking"}:
                continue
            text = block.get("text") or block.get("content") or block.get("thinking")
            if isinstance(text, str) and text.strip():
                reasoning_parts.append(text.strip())
        if reasoning_parts:
            return {
                "summary": "Model reasoning",
                "content": "\n\n".join(reasoning_parts),
                "duration_ms": None,
            }

    top_level_reasoning = response_json.get("reasoning")
    if isinstance(top_level_reasoning, str) and top_level_reasoning.strip():
        return {
            "summary": "Model reasoning",
            "content": top_level_reasoning.strip(),
            "duration_ms": None,
        }

    return None


def _extract_sources_payload(*, message: dict[str, Any], response_json: dict[str, Any]) -> list[dict[str, str | None]]:
    candidates: list[Any] = []
    for key in ("sources", "citations", "annotations"):
        value = message.get(key)
        if isinstance(value, list):
            candidates.extend(value)

    for key in ("sources", "citations"):
        value = response_json.get(key)
        if isinstance(value, list):
            candidates.extend(value)

    sources: list[dict[str, str | None]] = []
    for index, candidate in enumerate(candidates):
        if not isinstance(candidate, dict):
            continue
        url = candidate.get("url") or candidate.get("source_url")
        title = candidate.get("title") or candidate.get("name") or candidate.get("source")
        snippet = candidate.get("snippet") or candidate.get("quote")
        if not isinstance(url, str) or not url.strip():
            continue
        if not isinstance(title, str) or not title.strip():
            title = f"Source {index + 1}"
        if not isinstance(snippet, str):
            snippet = None
        sources.append(
            {
                "id": str(candidate.get("id") or f"source-{index + 1}"),
                "title": title.strip(),
                "url": url.strip(),
                "snippet": snippet.strip() if snippet else None,
            }
        )

    return sources


def _convert_tools_for_anthropic(tools: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    if not tools:
        return []

    out: list[dict[str, Any]] = []
    for tool in tools:
        if not isinstance(tool, dict):
            continue
        function = tool.get("function") if isinstance(tool.get("function"), dict) else {}
        name = function.get("name")
        if not isinstance(name, str) or not name.strip():
            continue
        description = function.get("description") if isinstance(function.get("description"), str) else ""
        input_schema = (
            function.get("parameters") if isinstance(function.get("parameters"), dict) else {"type": "object"}
        )
        out.append(
            {
                "name": name,
                "description": description,
                "input_schema": input_schema,
            }
        )
    return out


def _convert_messages_for_anthropic(
    messages: list[dict[str, Any]],
) -> tuple[list[str], list[dict[str, Any]]]:
    system_messages: list[str] = []
    anthropic_messages: list[dict[str, Any]] = []

    for message in messages:
        if not isinstance(message, dict):
            continue
        role = str(message.get("role") or "").strip().lower()

        if role == "system":
            content = message.get("content")
            if isinstance(content, str) and content.strip():
                system_messages.append(content)
            continue

        if role in {"user", "assistant"}:
            blocks: list[dict[str, Any]] = []
            content = message.get("content")
            if isinstance(content, str) and content:
                blocks.append({"type": "text", "text": content})

            raw_tool_calls = message.get("tool_calls")
            if role == "assistant" and isinstance(raw_tool_calls, list):
                for raw_tool_call in raw_tool_calls:
                    if not isinstance(raw_tool_call, dict):
                        continue
                    function = (
                        raw_tool_call.get("function")
                        if isinstance(raw_tool_call.get("function"), dict)
                        else {}
                    )
                    name = function.get("name") if isinstance(function.get("name"), str) else ""
                    if not name:
                        continue

                    raw_arguments = function.get("arguments")
                    arguments: dict[str, Any] = {}
                    if isinstance(raw_arguments, str) and raw_arguments.strip():
                        try:
                            decoded = json.loads(raw_arguments)
                            if isinstance(decoded, dict):
                                arguments = decoded
                        except json.JSONDecodeError:
                            arguments = {}

                    blocks.append(
                        {
                            "type": "tool_use",
                            "id": str(raw_tool_call.get("id") or uuid.uuid4()),
                            "name": name,
                            "input": arguments,
                        }
                    )

            if not blocks:
                blocks.append({"type": "text", "text": ""})
            anthropic_messages.append({"role": role, "content": blocks})
            continue

        if role == "tool":
            tool_call_id = str(message.get("tool_call_id") or "").strip()
            if not tool_call_id:
                tool_call_id = str(uuid.uuid4())

            content = message.get("content")
            if isinstance(content, str):
                result_text = content
            else:
                result_text = json.dumps(content, ensure_ascii=True, default=str)

            anthropic_messages.append(
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "tool_result",
                            "tool_use_id": tool_call_id,
                            "content": result_text,
                        }
                    ],
                }
            )

    if not anthropic_messages:
        anthropic_messages = [{"role": "user", "content": [{"type": "text", "text": ""}]}]

    return system_messages, anthropic_messages
