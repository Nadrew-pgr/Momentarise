from __future__ import annotations

import re
from datetime import UTC, datetime, timedelta
from typing import Any


class ToolExecutor:
    """Preview-first tooling helpers for Sync."""

    PREVIEW_TTL_MINUTES = 20

    @classmethod
    def default_preview_expiry(cls) -> datetime:
        return datetime.now(UTC) + timedelta(minutes=cls.PREVIEW_TTL_MINUTES)

    @classmethod
    def llm_tool_schemas(cls) -> list[dict[str, Any]]:
        return [
            {
                "type": "function",
                "function": {
                    "name": "calendar.events.range",
                    "description": "Read scheduled events in a date/time range.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "from_at": {"type": "string", "format": "date-time"},
                            "to_at": {"type": "string", "format": "date-time"},
                            "limit": {"type": "integer", "minimum": 1, "maximum": 200},
                        },
                        "required": ["from_at", "to_at"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "calendar.preferences.get",
                    "description": "Read calendar preference defaults such as working hours.",
                    "parameters": {"type": "object", "properties": {}},
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "calendar.patterns.suggest",
                    "description": "Suggest default color and duration for a similar title from history.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "title": {"type": "string"},
                        },
                        "required": ["title"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "travel.estimate",
                    "description": "Estimate travel time from origin to destination.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "origin": {"type": "string"},
                            "destination": {"type": "string"},
                            "mode": {"type": "string"},
                        },
                        "required": ["destination"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "memory.search",
                    "description": "Search workspace memory by query.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {"type": "string"},
                            "limit": {"type": "integer", "minimum": 1, "maximum": 10},
                        },
                        "required": ["query"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "item.preview",
                    "description": "Call this to show the user a structured application plan card (Apply/Cancel) for item create/update. Use this instead of describing the plan in plain text. Required for any item creation or modification intent.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "item_id": {"type": "string", "format": "uuid"},
                            "title": {"type": "string"},
                            "kind": {
                                "type": "string",
                                "enum": ["note", "objective", "task", "resource"],
                            },
                            "status": {
                                "type": "string",
                                "enum": ["draft", "captured", "processing", "ready", "applied", "archived"],
                            },
                            "metadata": {"type": "object"},
                            "blocks": {"type": "array"},
                            "changes": {"type": "object"},
                            "display_summary": {
                                "type": "string",
                                "description": "User-facing one-line or short text for the plan card (e.g. title, schedule, color, short description). Same style as your reply. Shown instead of raw parameters.",
                            },
                        },
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "event.preview",
                    "description": "Call this to show the user a structured application plan card (Apply/Cancel) for event create/update/delete. Use this instead of describing the plan in plain text. Required for any calendar/scheduling or event modification intent.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "operation": {
                                "type": "string",
                                "enum": ["create", "update", "delete"],
                            },
                            "event_id": {"type": "string", "format": "uuid"},
                            "item_id": {"type": "string", "format": "uuid"},
                            "title": {"type": "string"},
                            "start_at": {"type": "string", "format": "date-time"},
                            "end_at": {"type": "string", "format": "date-time"},
                            "estimated_time_seconds": {"type": "integer", "minimum": 0},
                            "color": {
                                "type": "string",
                                "enum": ["sky", "amber", "violet", "rose", "emerald", "orange"],
                            },
                            "changes": {"type": "object"},
                            "display_summary": {
                                "type": "string",
                                "description": "User-facing one-line or short text for the plan card (e.g. title, schedule, color, short description). Same style as your reply. Shown instead of raw parameters.",
                            },
                        },
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "inbox.transform.preview",
                    "description": "Call this to show the user a structured application plan card (Apply/Cancel) for transforming an inbox capture into item or event. Use this instead of describing the plan in plain text. Required when the user wants to turn a capture into an item or calendar event.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "capture_id": {"type": "string", "format": "uuid"},
                            "target": {"type": "string", "enum": ["item", "event"]},
                            "title": {"type": "string"},
                            "kind": {
                                "type": "string",
                                "enum": ["note", "objective", "task", "resource"],
                            },
                            "start_at": {"type": "string", "format": "date-time"},
                            "end_at": {"type": "string", "format": "date-time"},
                            "color": {
                                "type": "string",
                                "enum": ["sky", "amber", "violet", "rose", "emerald", "orange"],
                            },
                            "metadata": {"type": "object"},
                            "display_summary": {
                                "type": "string",
                                "description": "User-facing one-line or short text for the plan card (e.g. title, schedule, color, short description). Same style as your reply. Shown instead of raw parameters.",
                            },
                        },
                        "required": ["capture_id"],
                    },
                },
            },
        ]

    @classmethod
    def build_item_preview(cls, args: dict[str, Any], user_message: str) -> dict[str, Any]:
        item_id = cls._as_string(args.get("item_id"))
        display_summary = cls._as_string(args.get("display_summary"))

        if item_id:
            changes = args.get("changes") if isinstance(args.get("changes"), dict) else {}
            for key in ["title", "kind", "status", "metadata", "blocks"]:
                if key in args and args.get(key) is not None:
                    changes[key] = args.get(key)
            if not changes and user_message.strip():
                changes["title"] = cls.suggest_title(user_message)

            mutation: dict[str, Any] = {
                "kind": "item.update",
                "args": {
                    "item_id": item_id,
                    "changes": changes,
                },
            }
            if display_summary:
                mutation["display_summary"] = display_summary
            return {
                "summary": "Preview item update",
                "mutation": mutation,
            }

        title = cls._as_string(args.get("title")) or cls.suggest_title(user_message)
        kind = cls._as_string(args.get("kind")) or "note"
        status = cls._as_string(args.get("status")) or "draft"
        metadata = args.get("metadata") if isinstance(args.get("metadata"), dict) else {}
        blocks = args.get("blocks") if isinstance(args.get("blocks"), list) else []

        mutation = {
            "kind": "item.create",
            "args": {
                "title": title,
                "kind": kind,
                "status": status,
                "metadata": metadata,
                "blocks": blocks,
            },
        }
        if display_summary:
            mutation["display_summary"] = display_summary
        return {
            "summary": "Preview item creation",
            "mutation": mutation,
        }

    @classmethod
    def build_event_preview(cls, args: dict[str, Any], user_message: str) -> dict[str, Any]:
        operation = cls._as_string(args.get("operation"))
        event_id = cls._as_string(args.get("event_id"))
        display_summary = cls._as_string(args.get("display_summary"))

        if not operation:
            operation = "update" if event_id else "create"

        if operation == "delete":
            mutation: dict[str, Any] = {
                "kind": "event.delete",
                "args": {
                    "event_id": event_id,
                },
            }
            if display_summary:
                mutation["display_summary"] = display_summary
            return {
                "summary": "Preview event deletion",
                "mutation": mutation,
            }

        if operation == "update":
            changes = args.get("changes") if isinstance(args.get("changes"), dict) else {}
            for key in ["title", "start_at", "end_at", "estimated_time_seconds", "color", "item_id"]:
                if key in args and args.get(key) is not None:
                    changes[key] = args.get(key)
            if "color" in changes:
                changes["color"] = cls._normalize_event_color(changes.get("color"))

            mutation = {
                "kind": "event.update",
                "args": {
                    "event_id": event_id,
                    "changes": changes,
                },
            }
            if display_summary:
                mutation["display_summary"] = display_summary
            return {
                "summary": "Preview event update",
                "mutation": mutation,
            }

        start_at = cls._parse_datetime(args.get("start_at"))
        end_at = cls._parse_datetime(args.get("end_at"))
        inferred_start = cls._infer_start_from_text(user_message)
        if start_at is None and inferred_start is not None:
            start_at = inferred_start

        estimated_time_seconds = cls._as_int(args.get("estimated_time_seconds"))
        if estimated_time_seconds is None:
            estimated_time_seconds = cls._parse_duration_seconds_from_text(user_message)

        if start_at is not None and end_at is None and estimated_time_seconds is not None:
            end_at = start_at + timedelta(seconds=max(estimated_time_seconds, 900))

        start_at, end_at = cls._ensure_window(start_at, end_at)
        title = cls._as_string(args.get("title")) or cls.suggest_title(user_message)
        if estimated_time_seconds is None:
            estimated_time_seconds = max(0, int((end_at - start_at).total_seconds()))
        color = cls._normalize_event_color(args.get("color"))

        mutation = {
            "kind": "event.create",
            "args": {
                "title": title,
                "item_id": cls._as_string(args.get("item_id")),
                "start_at": start_at.isoformat(),
                "end_at": end_at.isoformat(),
                "estimated_time_seconds": estimated_time_seconds,
                "color": color,
            },
        }
        if display_summary:
            mutation["display_summary"] = display_summary
        return {
            "summary": "Preview event creation",
            "mutation": mutation,
        }

    @classmethod
    def build_inbox_transform_preview(cls, args: dict[str, Any], user_message: str) -> dict[str, Any]:
        target = cls._as_string(args.get("target")) or "item"
        title = cls._as_string(args.get("title")) or cls.suggest_title(user_message)
        display_summary = cls._as_string(args.get("display_summary"))

        payload: dict[str, Any] = {
            "capture_id": cls._as_string(args.get("capture_id")),
            "target": target,
            "title": title,
            "kind": cls._as_string(args.get("kind")) or "note",
            "metadata": args.get("metadata") if isinstance(args.get("metadata"), dict) else {},
        }

        if target == "event":
            start_at = cls._parse_datetime(args.get("start_at"))
            end_at = cls._parse_datetime(args.get("end_at"))
            start_at, end_at = cls._ensure_window(start_at, end_at)
            payload["start_at"] = start_at.isoformat()
            payload["end_at"] = end_at.isoformat()
            payload["color"] = cls._normalize_event_color(args.get("color"))

        mutation: dict[str, Any] = {
            "kind": "inbox.transform",
            "args": payload,
        }
        if display_summary:
            mutation["display_summary"] = display_summary
        return {
            "summary": "Preview inbox transform",
            "mutation": mutation,
        }

    @classmethod
    def suggest_title(cls, text: str) -> str:
        compact = " ".join((text or "").split())
        if not compact:
            return "New draft"
        return compact[:80]

    @staticmethod
    def _as_string(value: Any) -> str | None:
        if isinstance(value, str) and value.strip():
            return value.strip()
        return None

    @staticmethod
    def _as_int(value: Any) -> int | None:
        if isinstance(value, bool):
            return None
        if isinstance(value, int):
            return value
        if isinstance(value, float):
            return int(value)
        if isinstance(value, str):
            try:
                return int(value)
            except ValueError:
                return None
        return None

    @staticmethod
    def _parse_duration_seconds_from_text(text: str) -> int | None:
        compact = " ".join((text or "").lower().split())
        if not compact:
            return None

        hour_match = re.search(r"(\d+)\s*h(?:\s*(\d{1,2}))?", compact)
        if hour_match:
            hours = int(hour_match.group(1))
            minutes = int(hour_match.group(2)) if hour_match.group(2) else 0
            total = max(0, hours * 3600 + minutes * 60)
            return total if total > 0 else None

        minute_match = re.search(r"(\d+)\s*min", compact)
        if minute_match:
            minutes = int(minute_match.group(1))
            total = max(0, minutes * 60)
            return total if total > 0 else None

        return None

    @staticmethod
    def _infer_start_from_text(text: str) -> datetime | None:
        compact = " ".join((text or "").lower().split())
        if not compact:
            return None
        hour_match = re.search(r"\b(\d{1,2})\s*h(?:\s*(\d{1,2}))?\b", compact)
        if not hour_match:
            return None
        hour = int(hour_match.group(1))
        minute = int(hour_match.group(2)) if hour_match.group(2) else 0
        if hour > 23 or minute > 59:
            return None
        now = datetime.now(UTC)
        candidate = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
        if candidate < now - timedelta(minutes=15):
            candidate = candidate + timedelta(days=1)
        return candidate

    @staticmethod
    def _normalize_event_color(value: Any) -> str:
        raw = str(value or "").strip().lower()
        if not raw:
            return "sky"
        aliases = {
            "blue": "sky",
            "bleu": "sky",
            "bleue": "sky",
            "amber": "amber",
            "jaune": "amber",
            "violet": "violet",
            "purple": "violet",
            "rose": "rose",
            "pink": "rose",
            "green": "emerald",
            "vert": "emerald",
            "emerald": "emerald",
            "orange": "orange",
        }
        normalized = aliases.get(raw, raw)
        allowed = {"sky", "amber", "violet", "rose", "emerald", "orange"}
        return normalized if normalized in allowed else "sky"

    @staticmethod
    def _parse_datetime(value: Any) -> datetime | None:
        if not isinstance(value, str) or not value.strip():
            return None

        raw = value.strip().replace("Z", "+00:00")
        try:
            parsed = datetime.fromisoformat(raw)
        except ValueError:
            return None

        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=UTC)
        return parsed.astimezone(UTC)

    @staticmethod
    def _ensure_window(start_at: datetime | None, end_at: datetime | None) -> tuple[datetime, datetime]:
        now = datetime.now(UTC)
        start = start_at or (now + timedelta(hours=1))
        end = end_at or (start + timedelta(hours=1))
        if end <= start:
            end = start + timedelta(minutes=30)
        return start, end
