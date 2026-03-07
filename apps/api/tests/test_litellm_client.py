import contextlib
import os
import unittest
from collections.abc import Iterator
from unittest.mock import AsyncMock, patch

import httpx

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")
os.environ.setdefault("JWT_SECRET", "test-secret")

from src.core.config import settings
from src.sync.litellm_client import LiteLLMClient, LiteLLMClientError


@contextlib.contextmanager
def patch_sync_settings(**overrides: object) -> Iterator[None]:
    previous = {key: getattr(settings, key) for key in overrides}
    try:
        for key, value in overrides.items():
            setattr(settings, key, value)
        yield
    finally:
        for key, value in previous.items():
            setattr(settings, key, value)


def make_async_client_stub(
    *,
    response: httpx.Response | None = None,
    raise_error: Exception | None = None,
):
    class _AsyncClientStub:
        def __init__(self, *args, **kwargs):  # noqa: ANN002, ANN003
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):  # noqa: ANN001
            return False

        async def post(self, *args, **kwargs):  # noqa: ANN002, ANN003
            if raise_error is not None:
                raise raise_error
            assert response is not None
            return response

    return _AsyncClientStub


def make_async_client_sequence_stub(sequence: list[httpx.Response | Exception]):
    state = {"calls": 0}

    class _AsyncClientStub:
        def __init__(self, *args, **kwargs):  # noqa: ANN002, ANN003
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):  # noqa: ANN001
            return False

        async def post(self, *args, **kwargs):  # noqa: ANN002, ANN003
            index = state["calls"]
            state["calls"] += 1
            entry = sequence[index] if index < len(sequence) else sequence[-1]
            if isinstance(entry, Exception):
                raise entry
            return entry

    return _AsyncClientStub


class LiteLLMClientTests(unittest.IsolatedAsyncioTestCase):
    async def test_complete_success_with_tool_call(self) -> None:
        payload = {
            "choices": [
                {
                    "message": {
                        "content": "Done",
                        "reasoning": {"summary": "Reasoning", "content": "Because", "duration_ms": 250},
                        "citations": [
                            {
                                "id": "src-1",
                                "title": "Spec",
                                "url": "https://example.com/spec",
                                "snippet": "Snippet",
                            }
                        ],
                        "tool_calls": [
                            {
                                "id": "call_1",
                                "function": {
                                    "name": "item_preview",
                                    "arguments": '{"title":"Plan week"}',
                                },
                            }
                        ],
                    },
                    "finish_reason": "stop",
                }
            ],
            "usage": {"prompt_tokens": 12, "completion_tokens": 7, "total_tokens": 19},
        }
        response = httpx.Response(
            200,
            json=payload,
            headers={"content-type": "application/json"},
        )

        with (
            patch_sync_settings(
                SYNC_LLM_PROVIDER="mistral",
                MISTRAL_API_KEY="test-key",
                SYNC_ENABLE_FALLBACK=False,
                SYNC_MODEL_BALANCED="mistral-medium-latest",
            ),
            patch(
                "src.sync.litellm_client.httpx.AsyncClient",
                make_async_client_stub(response=response),
            ),
        ):
            out = await LiteLLMClient.complete(
                prompt="system",
                user_message="hello",
                tools=[{"type": "function", "function": {"name": "item_preview"}}],
            )

        self.assertEqual(out["provider"], "mistral")
        self.assertEqual(out["content"], "Done")
        self.assertEqual(out["usage"]["total_tokens"], 19)
        self.assertEqual(len(out["tool_calls"]), 1)
        self.assertEqual(out["tool_calls"][0]["name"], "item_preview")
        self.assertEqual(out["tool_calls"][0]["arguments"]["title"], "Plan week")
        self.assertEqual(out["reasoning"]["summary"], "Reasoning")
        self.assertEqual(out["sources"][0]["url"], "https://example.com/spec")

    async def test_complete_timeout_fallback_enabled(self) -> None:
        with (
            patch_sync_settings(
                SYNC_LLM_PROVIDER="mistral",
                MISTRAL_API_KEY="test-key",
                SYNC_ENABLE_FALLBACK=True,
                SYNC_MODEL_BALANCED="mistral-medium-latest",
            ),
            patch(
                "src.sync.litellm_client.httpx.AsyncClient",
                make_async_client_stub(raise_error=httpx.TimeoutException("timeout")),
            ),
        ):
            out = await LiteLLMClient.complete(prompt="system", user_message="hello")

        self.assertEqual(out["provider"], "fallback")
        self.assertIn("timed out", out["warning"])

    async def test_complete_unsupported_provider_without_fallback_raises(self) -> None:
        with patch_sync_settings(
            SYNC_LLM_PROVIDER="unsupported-provider",
            SYNC_ENABLE_FALLBACK=False,
            SYNC_MODEL_BALANCED="unknown-model-for-provider-test",
        ):
            with self.assertRaises(LiteLLMClientError) as ctx:
                await LiteLLMClient.complete(prompt="system", user_message="hello")

        self.assertEqual(ctx.exception.code, "provider_not_supported")

    async def test_complete_unsupported_provider_with_fallback(self) -> None:
        with patch_sync_settings(
            SYNC_LLM_PROVIDER="unsupported-provider",
            SYNC_ENABLE_FALLBACK=True,
            SYNC_MODEL_BALANCED="unknown-model-for-provider-test",
        ):
            out = await LiteLLMClient.complete(prompt="system", user_message="hello")

        self.assertEqual(out["provider"], "fallback")
        self.assertIn("Unsupported", out["warning"])

    async def test_complete_missing_api_key_without_fallback_raises(self) -> None:
        with patch_sync_settings(
            SYNC_LLM_PROVIDER="mistral",
            MISTRAL_API_KEY=None,
            SYNC_ENABLE_FALLBACK=False,
        ):
            with self.assertRaises(LiteLLMClientError) as ctx:
                await LiteLLMClient.complete(prompt="system", user_message="hello")

        self.assertEqual(ctx.exception.code, "missing_api_key")

    async def test_complete_provider_auth_error_without_fallback_raises(self) -> None:
        response = httpx.Response(
            401,
            json={"error": {"message": "Invalid API key"}},
            headers={"content-type": "application/json"},
        )
        with (
            patch_sync_settings(
                SYNC_LLM_PROVIDER="mistral",
                MISTRAL_API_KEY="bad-key",
                SYNC_ENABLE_FALLBACK=False,
            ),
            patch(
                "src.sync.litellm_client.httpx.AsyncClient",
                make_async_client_stub(response=response),
            ),
        ):
            with self.assertRaises(LiteLLMClientError) as ctx:
                await LiteLLMClient.complete(prompt="system", user_message="hello")

        self.assertEqual(ctx.exception.code, "provider_error")
        self.assertFalse(ctx.exception.retryable)

    async def test_complete_openai_provider_success(self) -> None:
        payload = {
            "choices": [
                {
                    "message": {
                        "content": "OpenAI ok",
                        "tool_calls": [
                            {
                                "id": "call_openai_1",
                                "function": {
                                    "name": "event.preview",
                                    "arguments": '{"operation":"create"}',
                                },
                            }
                        ],
                    },
                    "finish_reason": "stop",
                }
            ],
            "usage": {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15},
        }
        response = httpx.Response(
            200,
            json=payload,
            headers={"content-type": "application/json"},
        )

        with (
            patch_sync_settings(
                SYNC_LLM_PROVIDER="openai",
                OPENAI_API_KEY="test-openai-key",
                SYNC_ENABLE_FALLBACK=False,
                SYNC_MODEL_BALANCED="gpt-4.1-mini",
            ),
            patch(
                "src.sync.litellm_client.httpx.AsyncClient",
                make_async_client_stub(response=response),
            ),
        ):
            out = await LiteLLMClient.complete(prompt="system", user_message="hello")

        self.assertEqual(out["provider"], "openai")
        self.assertEqual(out["content"], "OpenAI ok")
        self.assertEqual(out["tool_calls"][0]["name"], "event.preview")

    async def test_complete_anthropic_provider_success(self) -> None:
        payload = {
            "model": "claude-3-5-sonnet-latest",
            "content": [
                {"type": "text", "text": "Anthropic ok"},
                {"type": "thinking", "thinking": "Reasoning trace"},
                {
                    "type": "tool_use",
                    "id": "toolu_123",
                    "name": "item_preview",
                    "input": {"title": "Prepare summary"},
                },
            ],
            "usage": {"input_tokens": 11, "output_tokens": 9},
            "stop_reason": "end_turn",
        }
        response = httpx.Response(
            200,
            json=payload,
            headers={"content-type": "application/json"},
        )

        with (
            patch_sync_settings(
                SYNC_LLM_PROVIDER="anthropic",
                ANTHROPIC_API_KEY="test-anthropic-key",
                SYNC_ENABLE_FALLBACK=False,
                SYNC_MODEL_BALANCED="claude-3-5-sonnet-latest",
            ),
            patch(
                "src.sync.litellm_client.httpx.AsyncClient",
                make_async_client_stub(response=response),
            ),
        ):
            out = await LiteLLMClient.complete(
                prompt="system",
                user_message="hello",
                tools=[
                    {
                        "type": "function",
                        "function": {
                            "name": "item_preview",
                            "description": "Preview item",
                            "parameters": {"type": "object"},
                        },
                    }
                ],
            )

        self.assertEqual(out["provider"], "anthropic")
        self.assertEqual(out["content"], "Anthropic ok")
        self.assertEqual(out["tool_calls"][0]["name"], "item_preview")
        self.assertEqual(out["tool_calls"][0]["arguments"]["title"], "Prepare summary")
        self.assertEqual(out["usage"]["total_tokens"], 20)
        self.assertEqual(out["reasoning"]["summary"], "Model reasoning")

    async def test_complete_model_prefix_overrides_provider(self) -> None:
        payload = {
            "choices": [
                {
                    "message": {"content": "Prefix ok", "tool_calls": []},
                    "finish_reason": "stop",
                }
            ],
            "usage": {"prompt_tokens": 2, "completion_tokens": 2, "total_tokens": 4},
        }
        response = httpx.Response(
            200,
            json=payload,
            headers={"content-type": "application/json"},
        )

        with (
            patch_sync_settings(
                SYNC_LLM_PROVIDER="mistral",
                OPENAI_API_KEY="test-openai-key",
                MISTRAL_API_KEY=None,
                SYNC_ENABLE_FALLBACK=False,
            ),
            patch(
                "src.sync.litellm_client.httpx.AsyncClient",
                make_async_client_stub(response=response),
            ),
        ):
            out = await LiteLLMClient.complete(
                prompt="system",
                user_message="hello",
                model="openai/gpt-4.1-mini",
            )

        self.assertEqual(out["provider"], "openai")

    async def test_complete_gemini_provider_success(self) -> None:
        payload = {
            "choices": [
                {
                    "message": {
                        "content": "Gemini ok",
                        "tool_calls": [
                            {
                                "id": "call_gemini_1",
                                "function": {
                                    "name": "item_preview",
                                    "arguments": '{"title":"Gemini action"}',
                                },
                            }
                        ],
                    },
                    "finish_reason": "stop",
                }
            ],
            "usage": {"prompt_tokens": 9, "completion_tokens": 4, "total_tokens": 13},
        }
        response = httpx.Response(
            200,
            json=payload,
            headers={"content-type": "application/json"},
        )

        with (
            patch_sync_settings(
                SYNC_LLM_PROVIDER="gemini",
                GEMINI_API_KEY="test-gemini-key",
                SYNC_ENABLE_FALLBACK=False,
                SYNC_MODEL_BALANCED="gemini-2.5-flash",
            ),
            patch(
                "src.sync.litellm_client.httpx.AsyncClient",
                make_async_client_stub(response=response),
            ),
        ):
            out = await LiteLLMClient.complete(prompt="system", user_message="hello")

        self.assertEqual(out["provider"], "gemini")
        self.assertEqual(out["content"], "Gemini ok")
        self.assertEqual(out["tool_calls"][0]["name"], "item_preview")

    async def test_complete_retries_then_succeeds(self) -> None:
        response = httpx.Response(
            200,
            json={
                "choices": [{"message": {"content": "Recovered", "tool_calls": []}, "finish_reason": "stop"}],
                "usage": {"prompt_tokens": 3, "completion_tokens": 3, "total_tokens": 6},
            },
            headers={"content-type": "application/json"},
        )

        with (
            patch_sync_settings(
                SYNC_LLM_PROVIDER="mistral",
                MISTRAL_API_KEY="test-key",
                SYNC_ENABLE_FALLBACK=False,
                SYNC_LLM_MAX_RETRIES=2,
            ),
            patch(
                "src.sync.litellm_client.httpx.AsyncClient",
                make_async_client_sequence_stub([httpx.TimeoutException("timeout"), response]),
            ),
            patch("src.sync.litellm_client.asyncio.sleep", new=AsyncMock()),
        ):
            out = await LiteLLMClient.complete(prompt="system", user_message="hello")

        self.assertEqual(out["provider"], "mistral")
        self.assertEqual(out["content"], "Recovered")
