# -*- coding: utf-8 -*-
"""OpenAI chat completions request/response schemas."""

from __future__ import annotations

from typing import Any, List, Literal, Optional, Union

from pydantic import BaseModel, Field


class ContentPart(BaseModel):
    """Content part (text or other)."""

    type: str = Field(default="text")
    text: Optional[str] = None


class ChatMessage(BaseModel):
    """Chat message in OpenAI format."""

    role: Literal["system", "user", "assistant"] = "user"
    content: Union[str, List[ContentPart], None] = None


class ThinkingConfig(BaseModel):
    """Thinking config (qnaigc extension)."""

    type: Literal["enabled", "disabled"] = "disabled"


class ChatCompletionRequest(BaseModel):
    """OpenAI chat completion request."""

    model: Optional[str] = None
    messages: List[ChatMessage] = Field(default_factory=list)
    stream: bool = True
    thinking: Optional[ThinkingConfig] = None

    model_config = {"extra": "allow"}


class UsageInfo(BaseModel):
    """Token usage info."""

    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class ChoiceMessage(BaseModel):
    """Choice message in response."""

    role: str = "assistant"
    content: Optional[str] = None


class Choice(BaseModel):
    """Choice in response."""

    index: int = 0
    message: Optional[ChoiceMessage] = None
    delta: Optional[ChoiceMessage] = None
    finish_reason: Optional[str] = "stop"


class ChatCompletionResponse(BaseModel):
    """OpenAI chat completion response."""

    id: str = "chatcmpl-openai-aicraw"
    object: str = "chat.completion"
    created: int = 0
    model: str = ""
    choices: List[Choice] = Field(default_factory=list)
    usage: Optional[UsageInfo] = None

    model_config = {"extra": "allow"}
