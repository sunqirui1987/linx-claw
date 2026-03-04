# -*- coding: utf-8 -*-
"""OpenAI-compatible /v1/chat/completions router."""

from __future__ import annotations

from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse

from ..config import load_config
from ..providers import load_providers_json
from .schemas import ChatCompletionRequest
from .service import (
    run_chat_completion,
    stream_chat_completion,
    build_openai_response,
)

router = APIRouter(tags=["openai"])


def _get_bearer_token(request: Request) -> str | None:
    """Extract Bearer token from Authorization header."""
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        return None
    return auth[7:].strip() or None


def _get_openai_api_key() -> str:
    """Get OpenAI API key: from config, or fallback to qnaigc provider."""
    config = load_config()
    api_key = getattr(config, "openai_api_key", None) or ""
    if api_key:
        return api_key
    # Fallback: use qnaigc provider's api_key (console login key)
    data = load_providers_json()
    _, qnaigc_key = data.get_credentials("qnaigc")
    return qnaigc_key or ""


def _verify_openai_auth(request: Request) -> None:
    """Verify OpenAI API key. Raises HTTPException on failure."""
    api_key = _get_openai_api_key()

    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="OpenAI API 未配置。请在 设置→通用配置 中配置 OpenAI API Key，或在 设置→模型 中配置 Qiniu MaaS 的 API Key",
        )

    token = _get_bearer_token(request)
    if not token:
        raise HTTPException(
            status_code=401,
            detail="请携带 Authorization: Bearer <API Key> 请求头。API Key 在 设置→通用配置 中配置，或使用 设置→模型 中 Qiniu MaaS 的 API Key",
        )
    if token != api_key:
        raise HTTPException(
            status_code=401,
            detail="API Key 无效，请确认与 设置→通用配置 或 Qiniu MaaS 中配置的 Key 一致",
        )


@router.post("/chat/completions")
async def chat_completions(request: Request, body: ChatCompletionRequest):
    """
    OpenAI-compatible chat completions endpoint.
    Uses same runner.stream_query as /api/agent/process; streams events
    as they arrive (content deltas, message completed, response).
    """
    _verify_openai_auth(request)

    runner = getattr(request.app.state, "runner", None)
    if runner is None:
        raise HTTPException(
            status_code=503,
            detail="Runner not initialized",
        )

    body_dict = body.model_dump(mode="json")
    stream = body_dict.get("stream", True)

    try:
        if stream:
            return StreamingResponse(
                stream_chat_completion(runner, body_dict),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no",
                },
            )
        else:
            full_text, usage = await run_chat_completion(
                runner, body_dict, stream=False
            )
            response = build_openai_response(full_text, usage, stream=False)
            return JSONResponse(content=response)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
