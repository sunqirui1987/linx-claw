# -*- coding: utf-8 -*-
"""Console authentication: API Key login (validates against qnaigc)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
import logging
import ssl
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

QNAIGC_USAGE_URL = "https://api.qnaigc.com/v2/stat/usage"


class LoginRequest(BaseModel):
    """Login request body."""

    apiKey: str = Field(..., min_length=1, description="API Key (e.g. qnaigc)")


class LoginResponse(BaseModel):
    """Login response."""

    success: bool
    error: str | None = None


def _usage_window_rfc3339() -> tuple[str, str]:
    """Return a small RFC3339 window for usage validation query."""
    tz = timezone(timedelta(hours=8))
    end_dt = datetime.now(tz).replace(microsecond=0)
    start_dt = (end_dt - timedelta(days=1)).replace(microsecond=0)
    return start_dt.isoformat(), end_dt.isoformat()


async def _validate_qnaigc_api_key(api_key: str) -> bool:
    """Validate API key via qnaigc usage endpoint."""
    try:
        import aiohttp
        import certifi

        start, end = _usage_window_rfc3339()
        timeout = aiohttp.ClientTimeout(total=10)
        ssl_ctx = ssl.create_default_context(cafile=certifi.where())
        connector = aiohttp.TCPConnector(ssl=ssl_ctx)
        async with aiohttp.ClientSession(timeout=timeout, connector=connector) as session:
            async with session.get(
                QNAIGC_USAGE_URL,
                params={
                    "granularity": "day",
                    "start": start,
                    "end": end,
                },
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
            ) as resp:
                if resp.status == 200:
                    return True
                body = await resp.text()
                logger.warning(
                    "qnaigc usage validation status=%s body=%s",
                    resp.status,
                    body[:200],
                )
                return False
    except Exception as e:
        logger.warning("qnaigc usage validation failed: %s", e)
        return False


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest) -> dict[str, Any]:
    """Validate API key and return success/failure.

    API Key must start with sk- (per Qiniu MaaS spec).
    Validates against qnaigc usage API using Authorization: Bearer sk-xxx.
    """
    api_key = (body.apiKey or "").strip()
    if not api_key:
        raise HTTPException(status_code=400, detail="apiKey is required")
    if not api_key.startswith("sk-"):
        raise HTTPException(
            status_code=401,
            detail="API Key 必须以 sk- 开头，请在七牛云控制台获取",
        )

    valid = await _validate_qnaigc_api_key(api_key)
    if not valid:
        raise HTTPException(status_code=401, detail="API Key 无效或验证失败")

    try:
        from ...providers import update_provider_settings
        update_provider_settings("qnaigc", api_key=api_key)
    except Exception:
        logger.warning("Failed to sync api_key to providers on login", exc_info=True)

    return {"success": True, "error": None}
