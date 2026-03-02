# -*- coding: utf-8 -*-
"""Fetch model list from OpenAI-compatible provider APIs.

Qiniu MaaS (qnaigc) API: https://apidocs.qnaigc.com/397274067e0
- GET /v1/models with Authorization: Bearer <APIKey>
- Response: { object, data: [{ id, object, created, owned_by }] }
"""

from __future__ import annotations

import json
import logging
import urllib.request
from typing import List, Optional

from .models import ModelInfo

logger = logging.getLogger(__name__)

# Provider IDs that support dynamic model fetch via GET /models
# qnaigc: https://apidocs.qnaigc.com/397274067e0
_DYNAMIC_FETCH_PROVIDERS = frozenset(["qnaigc"])


def fetch_models_from_api(
    base_url: str,
    api_key: str,
    timeout: float = 10.0,
) -> Optional[List[ModelInfo]]:
    """Fetch model list from OpenAI-compatible GET /models endpoint.

    Follows Qiniu MaaS spec: GET {base_url}/models, Bearer auth.
    See https://apidocs.qnaigc.com/397274067e0

    Args:
        base_url: API base URL (e.g. https://api.qnaigc.com/v1)
        api_key: API key for authentication
        timeout: Request timeout in seconds

    Returns:
        List of ModelInfo if successful, None on failure.
    """
    if not base_url or not api_key:
        return None
    url = base_url.rstrip("/") + "/models"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
    }
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode())
    except Exception as e:
        logger.debug("Failed to fetch models from %s: %s", url, e)
        return None

    models: List[ModelInfo] = []
    items = data.get("data") if isinstance(data, dict) else None
    if not isinstance(items, list):
        return None
    for item in items:
        if not isinstance(item, dict):
            continue
        mid = item.get("id")
        if not mid or not isinstance(mid, str):
            continue
        models.append(ModelInfo(id=mid, name=mid))
    return models if models else None


def get_provider_models(
    provider_id: str,
    base_url: str,
    api_key: str,
    fallback_models: List[ModelInfo],
) -> List[ModelInfo]:
    """Get model list for a provider, fetching from API when supported.

    For providers in _DYNAMIC_FETCH_PROVIDERS with valid credentials,
    fetches the actual list from GET /models. Otherwise returns fallback.
    """
    if provider_id not in _DYNAMIC_FETCH_PROVIDERS or not api_key:
        return fallback_models
    fetched = fetch_models_from_api(base_url, api_key)
    if fetched:
        return fetched
    return fallback_models
