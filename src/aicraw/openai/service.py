# -*- coding: utf-8 -*-
"""OpenAI chat completions service: format conversion + runner.stream_query."""

from __future__ import annotations

import json
import logging
import time
import uuid
from typing import Any, AsyncIterator, Optional

from agentscope_runtime.engine.schemas.agent_schemas import (
    AgentRequest,
    ContentType,
    Message,
    MessageType,
    Role,
    RunStatus,
    TextContent,
)

logger = logging.getLogger(__name__)


def _extract_text_from_content(content: Any) -> str:
    """Extract text from Message content (list of Content parts)."""
    if not content:
        return ""
    parts = []
    for c in content:
        if getattr(c, "type", None) == ContentType.TEXT and getattr(c, "text", None):
            parts.append(c.text or "")
        elif getattr(c, "type", None) == ContentType.REFUSAL and getattr(
            c, "refusal", None
        ):
            parts.append(c.refusal or "")
    return "".join(parts)


def _extract_text_from_message(msg: Any) -> str:
    """Extract text from a Message (event with object=message)."""
    content = getattr(msg, "content", None) or []
    return _extract_text_from_content(content)


def _extract_text_from_response(response: Any) -> str:
    """Extract text from AgentResponse (event with object=response)."""
    output = getattr(response, "output", None) or []
    if not output:
        return ""
    last_msg = output[-1]
    return _extract_text_from_message(last_msg)


def _get_role(m: Any) -> Optional[str]:
    """Get role from message (object or dict)."""
    if hasattr(m, "role"):
        return getattr(m, "role", None)
    if isinstance(m, dict):
        return m.get("role")
    return None


def _get_content(m: Any) -> Any:
    """Get content from message (object or dict)."""
    if hasattr(m, "content"):
        return getattr(m, "content", None)
    if isinstance(m, dict):
        return m.get("content")
    return None


def _content_to_text(content: Any) -> str:
    """Extract text from content (str or list of parts)."""
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        texts = []
        for part in content:
            if isinstance(part, dict) and part.get("type") == "text":
                texts.append(part.get("text", "") or "")
            elif hasattr(part, "text"):
                texts.append(getattr(part, "text", "") or "")
        return "\n".join(texts)
    return ""


def openai_messages_to_agent_input(messages: list) -> list:
    """Convert OpenAI messages to AgentRequest input (list of Message)."""
    if not messages:
        return []

    # Use last user message as the query (same as single-turn)
    last_user_content = ""
    for m in reversed(messages):
        if _get_role(m) == "user":
            content = _get_content(m)
            if content is not None:
                last_user_content = _content_to_text(content)
                break

    content_parts = [TextContent(type=ContentType.TEXT, text=last_user_content)]
    msg = Message(
        type=MessageType.MESSAGE,
        role=Role.USER,
        content=content_parts,
    )
    return [msg]


async def run_chat_completion(
    runner: Any,
    request_body: dict,
    stream: bool,
) -> tuple[str, Optional[dict]]:
    """
    Run chat completion via runner.stream_query.

    Returns (full_text, usage_dict or None).
    """
    messages = request_body.get("messages", [])
    if not messages:
        return "", None

    # Build AgentRequest
    input_msgs = openai_messages_to_agent_input(messages)
    if not input_msgs:
        return "", None

    session_id = f"openai-{uuid.uuid4().hex[:16]}"
    req = AgentRequest(
        session_id=session_id,
        user_id="openai",
        input=input_msgs,
        channel="console",
        stream=stream,
    )

    req_dict = req.model_dump(mode="json")
    req_dict["stream"] = stream

    full_text = ""
    usage = None

    async for event in runner.stream_query(req_dict):
        obj = getattr(event, "object", None)
        status = getattr(event, "status", None)

        if obj == "message" and status == RunStatus.Completed:
            full_text = _extract_text_from_message(event)
        elif obj == "response":
            full_text = _extract_text_from_response(event)
            usage_raw = getattr(event, "usage", None)
            if usage_raw and isinstance(usage_raw, dict):
                usage = {
                    "prompt_tokens": usage_raw.get("prompt_tokens", 0),
                    "completion_tokens": usage_raw.get("completion_tokens", 0),
                    "total_tokens": usage_raw.get("prompt_tokens", 0)
                    + usage_raw.get("completion_tokens", 0),
                }

    return full_text, usage


async def stream_chat_completion(
    runner: Any,
    request_body: dict,
) -> AsyncIterator[str]:
    """
    Stream chat completion via runner.stream_query.
    Yields OpenAI SSE chunks as each agent message completes (true streaming).
    """
    messages = request_body.get("messages", [])
    if not messages:
        return

    last_user_content = ""
    for m in reversed(messages):
        if _get_role(m) == "user":
            last_user_content = _content_to_text(_get_content(m))
            break
    if not last_user_content:
        return
    session_id = f"openai-{uuid.uuid4().hex[:16]}"
    # Match /api/agent/process request format exactly for same streaming behavior
    req_dict = {
        "input": [
            {
                "role": "user",
                "type": "message",
                "content": [{"type": "text", "text": last_user_content}],
            }
        ],
        "session_id": session_id,
        "user_id": "default",
        "channel": "console",
        "stream": True,
    }

    chunk_id = f"chatcmpl-{uuid.uuid4().hex[:24]}"
    created = int(time.time())

    def _make_chunk(delta: dict):
        return {
            "id": chunk_id,
            "object": "chat.completion.chunk",
            "created": created,
            "model": "",
            "choices": [{"index": 0, "delta": delta, "finish_reason": None}],
        }

    def _chunk_text(text: str, chunk_size: int = 32) -> list[str]:
        """Split text into small chunks for simulated streaming when agent returns full text."""
        if not text:
            return []
        chunks = []
        for i in range(0, len(text), chunk_size):
            chunks.append(text[i : i + chunk_size])
        return chunks

    # First chunk: role assistant (OpenAI stream format)
    yield f"data: {json.dumps(_make_chunk({'role': 'assistant', 'content': ''}), ensure_ascii=False)}\n\n"

    streamed_msg_ids: set = set()  # avoid duplicate: skip message.completed if we streamed content
    streamed_any = False  # avoid duplicate: skip response if we already streamed from message/content

    async for event in runner.stream_query(req_dict):
        obj = getattr(event, "object", None)
        status = getattr(event, "status", None)

        # Stream text deltas from content events (same as /api/agent/process)
        if obj == "content":
            content_type = getattr(event, "type", None)
            if content_type == ContentType.TEXT:
                text = getattr(event, "text", None) or ""
                if text:
                    streamed_any = True
                    msg_id = getattr(event, "msg_id", None)
                    if msg_id:
                        streamed_msg_ids.add(msg_id)
                    yield f"data: {json.dumps(_make_chunk({'content': text}), ensure_ascii=False)}\n\n"
        elif obj == "message" and status == RunStatus.Completed:
            msg_id = getattr(event, "id", None)
            if msg_id and msg_id in streamed_msg_ids:
                continue
            text = _extract_text_from_message(event)
            if text:
                streamed_any = True
                for piece in _chunk_text(text):
                    yield f"data: {json.dumps(_make_chunk({'content': piece}), ensure_ascii=False)}\n\n"
        elif obj == "response" and not streamed_any:
            text = _extract_text_from_response(event)
            if text:
                for piece in _chunk_text(text):
                    yield f"data: {json.dumps(_make_chunk({'content': piece}), ensure_ascii=False)}\n\n"

    # Final chunk with finish_reason
    final_chunk = {
        "id": chunk_id,
        "object": "chat.completion.chunk",
        "created": created,
        "model": "",
        "choices": [
            {
                "index": 0,
                "delta": {},
                "finish_reason": "stop",
            }
        ],
    }
    yield f"data: {json.dumps(final_chunk, ensure_ascii=False)}\n\n"
    yield "data: [DONE]\n\n"


def build_openai_response(
    text: str,
    usage: Optional[dict] = None,
    stream: bool = False,
) -> dict:
    """Build OpenAI-format response."""
    created = int(time.time())
    if stream:
        return {
            "id": f"chatcmpl-{uuid.uuid4().hex[:24]}",
            "object": "chat.completion.chunk",
            "created": created,
            "model": "",
            "choices": [
                {
                    "index": 0,
                    "delta": {"role": "assistant", "content": text},
                    "finish_reason": "stop",
                }
            ],
        }
    return {
        "id": f"chatcmpl-{uuid.uuid4().hex[:24]}",
        "object": "chat.completion",
        "created": created,
        "model": "",
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": text},
                "finish_reason": "stop",
            }
        ],
        "usage": usage or {
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0,
        },
    }
