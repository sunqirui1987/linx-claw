# -*- coding: utf-8 -*-
"""Console authentication: API Key login (validates against qnaigc)."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

QNAIGC_MODELS_URL = "https://api.qnaigc.com/v1/models"


class LoginRequest(BaseModel):
    """Login request body."""

    apiKey: str = Field(..., min_length=1, description="API Key (e.g. qnaigc)")


class LoginResponse(BaseModel):
    """Login response."""

    success: bool
    error: str | None = None


async def _validate_qnaigc_api_key(api_key: str) -> bool:
    """Validate API key by calling qnaigc models endpoint."""
    try:
        import aiohttp

        timeout = aiohttp.ClientTimeout(total=10)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(
                QNAIGC_MODELS_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
            ) as resp:
                if resp.status == 200:
                    return True
                if resp.status == 401:
                    return False
                body = await resp.text()
                logger.warning("qnaigc validation status=%s body=%s", resp.status, body[:200])
                return False
    except Exception as e:
        logger.warning("qnaigc validation failed: %s", e)
        return False


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest) -> dict[str, Any]:
    """Validate API key and return success/failure.

    API Key must start with sk- (per Qiniu MaaS spec).
    Validates against qnaigc API using Authorization: Bearer sk-xxx.
    """
    api_key = (body.apiKey or "").strip()
    if not api_key:
        raise HTTPException(status_code=400, detail="apiKey is required")
    if not api_key.startswith("sk-"):
        return {"success": False, "error": "API Key 必须以 sk- 开头，请在七牛云控制台获取"}

    valid = await _validate_qnaigc_api_key(api_key)
    if valid:
        return {"success": True, "error": None}
    return {"success": False, "error": "API Key 无效或验证失败"}
