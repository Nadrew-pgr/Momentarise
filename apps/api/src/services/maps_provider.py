import logging
from typing import Any

from src.services.provider_config import MapsProviderConfig, load_maps_provider_config
from src.services.provider_http import encode_query, extract_http_error, get_json

logger = logging.getLogger(__name__)


def estimate_travel_minutes(
    *,
    destination: str | None,
    origin: str | None,
    preferred_mode: str | None = None,
    config: MapsProviderConfig | None = None,
) -> dict[str, Any]:
    cfg = config or load_maps_provider_config()
    mode = (preferred_mode or cfg.default_mode or "driving").lower()
    if not destination:
        return {
            "provider": "heuristic",
            "mode": mode,
            "estimated_duration_minutes": 25,
        }

    if cfg.provider != "google_maps" or not cfg.api_key or not origin:
        return {
            "provider": "heuristic",
            "mode": mode,
            "estimated_duration_minutes": 25,
        }

    try:
        query = encode_query(
            {
                "origins": origin,
                "destinations": destination,
                "mode": mode,
                "key": cfg.api_key,
                "language": "fr",
            }
        )
        response = get_json(
            f"https://maps.googleapis.com/maps/api/distancematrix/json?{query}",
            timeout_seconds=cfg.timeout_seconds,
        )
        rows = response.get("rows")
        if not isinstance(rows, list) or not rows:
            raise ValueError("Missing rows in distance matrix response")
        first_row = rows[0] if isinstance(rows[0], dict) else {}
        elements = first_row.get("elements")
        if not isinstance(elements, list) or not elements:
            raise ValueError("Missing elements in distance matrix response")
        element = elements[0] if isinstance(elements[0], dict) else {}
        duration = element.get("duration")
        duration_seconds = duration.get("value") if isinstance(duration, dict) else None
        if not isinstance(duration_seconds, (int, float)) or duration_seconds <= 0:
            raise ValueError("Missing duration in distance matrix response")
        return {
            "provider": "google_maps",
            "mode": mode,
            "estimated_duration_minutes": max(1, int(round(float(duration_seconds) / 60))),
        }
    except Exception as exc:
        logger.warning("maps provider failed: %s", extract_http_error(exc))
        return {
            "provider": "heuristic",
            "mode": mode,
            "estimated_duration_minutes": 25,
        }
