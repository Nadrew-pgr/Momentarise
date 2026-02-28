from datetime import UTC, datetime, timedelta


class ToolExecutor:
    """Preview-first execution primitive for Sync."""

    PREVIEW_TTL_MINUTES = 15

    @classmethod
    def build_preview_from_message(cls, message: str) -> dict:
        normalized = message.strip() or "No-op suggestion"
        return {
            "summary": "Proposed change from Sync",
            "delta": normalized,
            "generated_from": "message",
        }

    @classmethod
    def default_preview_expiry(cls) -> datetime:
        return datetime.now(UTC) + timedelta(minutes=cls.PREVIEW_TTL_MINUTES)
