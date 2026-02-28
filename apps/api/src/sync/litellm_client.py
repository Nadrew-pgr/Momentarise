class LiteLLMClient:
    """Gateway façade. In V1 this stays deterministic unless a provider is wired."""

    @staticmethod
    async def complete(*, prompt: str, user_message: str, model: str | None = None) -> dict:
        # Deterministic fallback response keeps Sync usable without external model config.
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
            "provider": "litellm",
            "model": model or "local-sync-fallback",
            "usage": usage,
        }
