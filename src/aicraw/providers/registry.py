# -*- coding: utf-8 -*-
"""Built-in provider definitions and registry."""

from __future__ import annotations

import re
from typing import TYPE_CHECKING, List, Optional, Type

from agentscope.model import ChatModelBase, OpenAIChatModel

from .models import CustomProviderData, ModelInfo, ProviderDefinition

if TYPE_CHECKING:
    from .models import ProvidersData

QNAIGC_MODELS: List[ModelInfo] = [
    ModelInfo(id="qwen3-max", name="Qwen3 Max"),
    ModelInfo(
        id="qwen3-235b-a22b-thinking-2507",
        name="Qwen3 235B A22B Thinking",
    ),
    ModelInfo(id="deepseek-v3", name="DeepSeek-V3"),
    ModelInfo(id="deepseek-v3.1", name="DeepSeek-V3.1"),
    ModelInfo(id="deepseek-v3.2", name="DeepSeek-V3.2"),
    ModelInfo(id="gpt-4", name="GPT-4"),
    ModelInfo(id="gpt-4o", name="GPT-4o"),
    ModelInfo(id="claude-3-5-sonnet", name="Claude 3.5 Sonnet"),
    ModelInfo(id="claude-3-5-haiku", name="Claude 3.5 Haiku"),
    ModelInfo(id="gemini-2.5-pro", name="Gemini 2.5 Pro"),
    ModelInfo(id="gemini-2.5-flash", name="Gemini 2.5 Flash"),
]

PROVIDER_QNAIGC = ProviderDefinition(
    id="qnaigc",
    name="Qiniu MaaS (qnaigc)",
    default_base_url="https://api.qnaigc.com/v1",
    api_key_prefix="",
    models=QNAIGC_MODELS,
)

_BUILTIN_IDS: frozenset[str] = frozenset(["qnaigc"])

PROVIDERS: dict[str, ProviderDefinition] = {
    PROVIDER_QNAIGC.id: PROVIDER_QNAIGC,
}

_VALID_ID_RE = re.compile(r"^[a-z][a-z0-9_-]{0,63}$")


def get_provider(provider_id: str) -> Optional[ProviderDefinition]:
    return PROVIDERS.get(provider_id)


def get_provider_chat_model(
    provider_id: str,
    providers_data: Optional[ProvidersData] = None,
) -> str:
    """Get chat model name for a provider, checking JSON settings first.

    Args:
        provider_id: Provider identifier.
        providers_data: Optional ProvidersData. If None, will load from JSON.

    Returns:
        Chat model class name, defaults to "OpenAIChatModel".
    """
    if providers_data is None:
        from .store import load_providers_json

        providers_data = load_providers_json()

    cpd = providers_data.custom_providers.get(provider_id)
    if cpd is not None:
        return cpd.chat_model

    settings = providers_data.providers.get(provider_id)
    if settings and settings.chat_model:
        return settings.chat_model

    provider_def = get_provider(provider_id)
    if provider_def:
        return provider_def.chat_model

    return "OpenAIChatModel"


def list_providers() -> List[ProviderDefinition]:
    return list(PROVIDERS.values())


def is_builtin(provider_id: str) -> bool:
    return provider_id in _BUILTIN_IDS


def _custom_data_to_definition(cpd: CustomProviderData) -> ProviderDefinition:
    return ProviderDefinition(
        id=cpd.id,
        name=cpd.name,
        default_base_url=cpd.default_base_url,
        api_key_prefix=cpd.api_key_prefix,
        models=list(cpd.models),
        is_custom=True,
        chat_model=cpd.chat_model,
    )


def validate_custom_provider_id(provider_id: str) -> Optional[str]:
    """Return an error message if invalid, or None if valid."""
    if provider_id in _BUILTIN_IDS:
        return f"'{provider_id}' is a built-in provider id and cannot be used."
    if not _VALID_ID_RE.match(provider_id):
        return (
            f"Invalid provider id '{provider_id}'. "
            "Must start with a lowercase letter and contain only "
            "lowercase letters, digits, hyphens, and underscores "
            "(max 64 chars)."
        )
    return None


def register_custom_provider(cpd: CustomProviderData) -> ProviderDefinition:
    err = validate_custom_provider_id(cpd.id)
    if err:
        raise ValueError(err)
    defn = _custom_data_to_definition(cpd)
    PROVIDERS[cpd.id] = defn
    return defn


def unregister_custom_provider(provider_id: str) -> None:
    if provider_id in _BUILTIN_IDS:
        raise ValueError(f"Cannot remove built-in provider '{provider_id}'.")
    PROVIDERS.pop(provider_id, None)


def sync_custom_providers(
    custom_providers: dict[str, CustomProviderData],
) -> None:
    """Synchronise the in-memory registry with persisted custom providers."""
    stale = [
        pid
        for pid, defn in PROVIDERS.items()
        if defn.is_custom and pid not in custom_providers
    ]
    for pid in stale:
        del PROVIDERS[pid]
    for cpd in custom_providers.values():
        PROVIDERS[cpd.id] = _custom_data_to_definition(cpd)


def sync_local_models() -> None:
    """Refresh local provider model lists. No-op when only qnaigc is used."""
    pass


def sync_ollama_models() -> None:
    """Refresh Ollama provider model list. No-op when only qnaigc is used."""
    pass


_CHAT_MODEL_MAP: dict[str, Type[ChatModelBase]] = {
    "OpenAIChatModel": OpenAIChatModel,
}


def get_chat_model_class(chat_model_name: str) -> Type[ChatModelBase]:
    """Get chat model class by name.

    Args:
        chat_model_name: Name of the chat model class (e.g., "OpenAIChatModel")

    Returns:
        Chat model class, defaults to OpenAIChatModel if not found.
    """
    return _CHAT_MODEL_MAP.get(chat_model_name, OpenAIChatModel)
