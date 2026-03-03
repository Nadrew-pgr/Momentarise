import asyncio
import json
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from time import perf_counter
from uuid import uuid4

from alembic import command
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import create_async_engine

from src.api.v1.auth import router as auth_router
from src.api.v1.capture_external import router as capture_external_router
from src.api.v1.events import router as events_router
from src.api.v1.health import router as health_router
from src.api.v1.inbox import router as inbox_router
from src.api.v1.items import router as items_router
from src.api.v1.preferences import router as preferences_router
from src.api.v1.projects import router as projects_router
from src.api.v1.series import router as series_router
from src.api.v1.sync import router as sync_router
from src.api.v1.timeline import router as timeline_router
from src.api.v1.today import router as today_router
from src.core.config import settings

logger = logging.getLogger(__name__)


def _is_production_env() -> bool:
    return settings.APP_ENV.strip().lower() in {"prod", "production"}


def _alembic_config() -> Config:
    api_root = Path(__file__).resolve().parents[1]
    config = Config(str(api_root / "alembic.ini"))
    config.set_main_option("script_location", str(api_root / "alembic"))
    return config


def _head_revisions(config: Config) -> tuple[str, ...]:
    script = ScriptDirectory.from_config(config)
    heads = script.get_heads()
    return tuple(heads)


async def _current_revisions() -> tuple[str, ...]:
    engine = create_async_engine(settings.DATABASE_URL)
    try:
        async with engine.connect() as connection:
            return await connection.run_sync(
                lambda sync_conn: tuple(
                    MigrationContext.configure(sync_conn).get_current_heads()
                )
            )
    finally:
        await engine.dispose()


def _run_alembic_upgrade_head(config: Config) -> None:
    command.upgrade(config, "head")


async def _ensure_database_migrated() -> None:
    config = _alembic_config()
    current = set(await _current_revisions())
    head = set(_head_revisions(config))
    migration_applied = False

    if current != head and settings.AUTO_MIGRATE_ON_STARTUP:
        try:
            await asyncio.wait_for(
                asyncio.to_thread(_run_alembic_upgrade_head, config),
                timeout=settings.AUTO_MIGRATE_TIMEOUT_SECONDS,
            )
            migration_applied = True
            current = set(await _current_revisions())
        except Exception:
            logger.exception(
                "startup.migration_failed db_revision_current=%s db_revision_head=%s",
                ",".join(sorted(current)) or "base",
                ",".join(sorted(head)) or "base",
            )
            raise
    elif current != head:
        logger.warning(
            "startup.migration_pending db_revision_current=%s db_revision_head=%s auto_migrate=false",
            ",".join(sorted(current)) or "base",
            ",".join(sorted(head)) or "base",
        )

    logger.info(
        "startup.db_revision db_revision_current=%s db_revision_head=%s migration_applied=%s",
        ",".join(sorted(current)) or "base",
        ",".join(sorted(head)) or "base",
        migration_applied,
    )


@asynccontextmanager
async def lifespan(_: FastAPI):
    await _ensure_database_migrated()
    yield


app = FastAPI(title="Momentarise API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _request_id_from_request(request: Request) -> str:
    value = getattr(request.state, "request_id", None)
    if isinstance(value, str) and value.strip():
        return value
    return "unknown"


def _log_http(
    *,
    request_id: str,
    method: str,
    path: str,
    status_code: int,
    duration_ms: float,
    client_ip: str | None,
    content_length: int | None,
) -> None:
    payload = {
        "request_id": request_id,
        "method": method,
        "path": path,
        "status": status_code,
        "duration_ms": round(duration_ms, 2),
        "client_ip": client_ip,
        "content_length": content_length,
    }
    if _is_production_env():
        logger.info(json.dumps(payload, separators=(",", ":"), ensure_ascii=True))
        return
    logger.info(
        "http request_id=%s method=%s path=%s status=%s duration_ms=%.2f client_ip=%s content_length=%s",
        request_id,
        method,
        path,
        status_code,
        duration_ms,
        client_ip,
        content_length if content_length is not None else "-",
    )


@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or uuid4().hex
    request.state.request_id = request_id
    started = perf_counter()
    client_ip = request.client.host if request.client else None

    raw_content_length = request.headers.get("content-length")
    content_length = None
    if raw_content_length is not None:
        try:
            content_length = int(raw_content_length)
        except ValueError:
            content_length = None

    try:
        response = await call_next(request)
    except Exception:
        duration_ms = (perf_counter() - started) * 1000
        _log_http(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            status_code=500,
            duration_ms=duration_ms,
            client_ip=client_ip,
            content_length=content_length,
        )
        raise

    duration_ms = (perf_counter() - started) * 1000
    response.headers["X-Request-ID"] = request_id
    _log_http(
        request_id=request_id,
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration_ms=duration_ms,
        client_ip=client_ip,
        content_length=content_length,
    )
    return response


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    request_id = _request_id_from_request(request)
    headers = dict(exc.headers or {})
    headers["X-Request-ID"] = request_id
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "request_id": request_id},
        headers=headers,
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = _request_id_from_request(request)
    logger.exception(
        "request.unhandled request_id=%s method=%s path=%s error=%s",
        request_id,
        request.method,
        request.url.path,
        str(exc),
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "request_id": request_id},
        headers={"X-Request-ID": request_id},
    )

app.include_router(health_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(today_router, prefix="/api/v1")
app.include_router(timeline_router, prefix="/api/v1")
app.include_router(events_router, prefix="/api/v1")
app.include_router(inbox_router, prefix="/api/v1")
app.include_router(items_router, prefix="/api/v1/items")
app.include_router(preferences_router, prefix="/api/v1/preferences")
app.include_router(projects_router, prefix="/api/v1/projects")
app.include_router(series_router, prefix="/api/v1/series")
app.include_router(capture_external_router, prefix="/api/v1")
app.include_router(sync_router, prefix="/api/v1")
