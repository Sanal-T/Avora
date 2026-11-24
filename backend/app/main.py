import json
import logging
import traceback
import urllib.request
from datetime import datetime, timezone
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.core.config import get_settings

# Configure structured system logging with ISO timestamps
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S%z",
)
logger = logging.getLogger("avora.api")

settings = get_settings()

# Initialize optional Sentry SDK error tracking if configured
if settings.sentry_dsn:
    try:
        import sentry_sdk
        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            traces_sample_rate=0.2,
            environment=settings.app_env,
        )
        logger.info("Sentry error tracking initialized for environment: %s", settings.app_env)
    except ImportError:
        logger.warning("sentry_dsn provided but sentry_sdk package is not installed.")

app = FastAPI(title=settings.app_name, version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


def _dispatch_error_webhook(method: str, path: str, exc: Exception, tb_text: str) -> None:
    """Dispatches an asynchronous alert to Discord / Slack / Teams if configured."""
    if not settings.error_webhook_url:
        return
    try:
        payload = {
            "text": (
                f"🚨 **[Avora ERP Error Alert - {settings.app_env.upper()}]**\n"
                f"**Endpoint:** `{method} {path}`\n"
                f"**Error:** `{type(exc).__name__}: {str(exc)}`\n"
                f"**Timestamp:** `{datetime.now(timezone.utc).isoformat()}`\n"
                f"```python\n{tb_text[-1200:]}\n```"
            )
        }
        req = urllib.request.Request(
            settings.error_webhook_url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json", "User-Agent": "Avora-ERP-Monitor/1.0"},
            method="POST",
        )
        urllib.request.urlopen(req, timeout=3)
    except Exception as notify_err:
        logger.warning("Failed to dispatch error webhook notification: %s", notify_err)


@app.exception_handler(Exception)
async def global_unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    tb_text = traceback.format_exc()
    # Log the full exception with stack trace on the server side
    logger.error("Unhandled API exception on %s %s: %s\n%s", request.method, request.url.path, exc, tb_text)
    
    # Send immediate webhook alert to developers if configured
    _dispatch_error_webhook(request.method, request.url.path, exc, tb_text)

    # Never leak internal database schema, SQL errors, or stack traces to client
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected server error occurred. Please contact the administrator."},
    )


app.include_router(api_router, prefix="/api")
