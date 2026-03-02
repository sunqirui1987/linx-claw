# -*- coding: utf-8 -*-
import os
from pathlib import Path

WORKING_DIR = (
    Path(os.environ.get("AICRAW_WORKING_DIR", "~/.aicraw"))
    .expanduser()
    .resolve()
)

JOBS_FILE = os.environ.get("AICRAW_JOBS_FILE", "jobs.json")

CHATS_FILE = os.environ.get("AICRAW_CHATS_FILE", "chats.json")

CONFIG_FILE = os.environ.get("AICRAW_CONFIG_FILE", "config.json")

HEARTBEAT_FILE = os.environ.get("AICRAW_HEARTBEAT_FILE", "HEARTBEAT.md")
HEARTBEAT_DEFAULT_EVERY = "30m"
HEARTBEAT_DEFAULT_TARGET = "main"
HEARTBEAT_TARGET_LAST = "last"

# Env key for app log level (used by CLI and app load for reload child).
LOG_LEVEL_ENV = "AICRAW_LOG_LEVEL"

# When True, expose /docs, /redoc, /openapi.json
# (dev only; keep False in prod).
DOCS_ENABLED = os.environ.get("AICRAW_OPENAPI_DOCS", "false").lower() in (
    "true",
    "1",
    "yes",
)

# Skills directories
# Active skills directory (activated skills that agents use)
ACTIVE_SKILLS_DIR = WORKING_DIR / "active_skills"
# Customized skills directory (user-created skills)
CUSTOMIZED_SKILLS_DIR = WORKING_DIR / "customized_skills"

# Memory directory
MEMORY_DIR = WORKING_DIR / "memory"

# Custom channel modules (installed via `aicraw channels install`); manager
# loads BaseChannel subclasses from here.
CUSTOM_CHANNELS_DIR = WORKING_DIR / "custom_channels"

# Local models directory
MODELS_DIR = WORKING_DIR / "models"

# Memory compaction configuration
MEMORY_COMPACT_KEEP_RECENT = int(
    os.environ.get("AICRAW_MEMORY_COMPACT_KEEP_RECENT", "3"),
)

MEMORY_COMPACT_RATIO = float(
    os.environ.get("AICRAW_MEMORY_COMPACT_RATIO", "0.7"),
)

DASHSCOPE_BASE_URL = os.environ.get(
    "DASHSCOPE_BASE_URL",
    "https://dashscope.aliyuncs.com/compatible-mode/v1",
)

# Console auth: when True, require Authorization: Bearer <apiKey> for /api/* (except /api/auth/login, /api/version).
CONSOLE_REQUIRE_AUTH = os.environ.get("AICRAW_CONSOLE_REQUIRE_AUTH", "true").lower() in (
    "true",
    "1",
    "yes",
)

# CORS configuration — comma-separated list of allowed origins for dev mode.
# Example: AICRAW_CORS_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"
# When unset, CORS middleware is not applied.
CORS_ORIGINS = os.environ.get("AICRAW_CORS_ORIGINS", "").strip()

# ---------------------------------------------------------------------------
# Channel availability — controlled by AICRAW_ENABLED_CHANNELS env var.
# When unset / empty, all registered channels (built-in + plugins) are
# available. Set to a comma-separated list to restrict, e.g.
#   AICRAW_ENABLED_CHANNELS=dingtalk,feishu,qq,console
# ---------------------------------------------------------------------------


def get_available_channels() -> tuple[str, ...]:
    """Return channel keys enabled for this run (built-in + entry point
    aicraw.channels), filtered by AICRAW_ENABLED_CHANNELS when set.
    """
    from .app.channels.registry import get_channel_registry

    registry = get_channel_registry()
    all_keys = tuple(registry.keys())
    raw = os.environ.get("AICRAW_ENABLED_CHANNELS", "").strip()
    if not raw:
        return all_keys
    enabled = tuple(ch.strip() for ch in raw.split(",") if ch.strip())
    return tuple(k for k in all_keys if k in enabled) or all_keys
