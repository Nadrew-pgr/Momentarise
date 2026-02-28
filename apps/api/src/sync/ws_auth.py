import uuid
from datetime import UTC, datetime, timedelta

import jwt

from src.core.config import settings


_USED_JTI: dict[str, datetime] = {}


def _cleanup_used_jti() -> None:
    now = datetime.now(UTC)
    expired = [jti for jti, expiry in _USED_JTI.items() if expiry <= now]
    for jti in expired:
        _USED_JTI.pop(jti, None)


def issue_ws_token(*, user_id: uuid.UUID, run_id: uuid.UUID, ttl_seconds: int = 90) -> tuple[str, datetime]:
    _cleanup_used_jti()
    ttl = max(30, min(120, ttl_seconds))
    now = datetime.now(UTC)
    exp = now + timedelta(seconds=ttl)
    jti = str(uuid.uuid4())
    payload = {
        "sub": str(user_id),
        "run": str(run_id),
        "jti": jti,
        "iat": int(now.timestamp()),
        "exp": exp,
    }
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return token, exp


def verify_ws_token(*, token: str, expected_user_id: uuid.UUID, expected_run_id: uuid.UUID) -> dict:
    _cleanup_used_jti()
    payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])

    if payload.get("sub") != str(expected_user_id):
        raise ValueError("Invalid ws token subject")
    if payload.get("run") != str(expected_run_id):
        raise ValueError("Invalid ws token run")

    jti = payload.get("jti")
    if not isinstance(jti, str) or not jti:
        raise ValueError("Invalid ws token jti")

    if jti in _USED_JTI:
        raise ValueError("WS token already consumed")

    exp_value = payload.get("exp")
    if isinstance(exp_value, int):
        expiry = datetime.fromtimestamp(exp_value, tz=UTC)
    elif isinstance(exp_value, float):
        expiry = datetime.fromtimestamp(int(exp_value), tz=UTC)
    else:
        raise ValueError("Invalid ws token expiry")

    _USED_JTI[jti] = expiry
    return payload
