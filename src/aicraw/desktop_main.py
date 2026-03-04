# -*- coding: utf-8 -*-
"""Desktop app entry: native window loading LinClaw console via PyWebView."""
from __future__ import annotations

import logging
import os
import subprocess
import sys
import threading
import time
from urllib.request import Request, urlopen
from urllib.error import URLError

from .constant import LOG_LEVEL_ENV
from .config.utils import get_config_path, write_last_api
from .utils.logging import setup_logger

LOG = logging.getLogger(__name__)

HOST = "127.0.0.1"
PORT = 8088
URL = f"http://{HOST}:{PORT}"
VERSION_URL = f"{URL}/api/version"


def _ensure_init() -> bool:
    """Run aicraw init --defaults --accept-security if config missing."""
    config_path = get_config_path()
    if config_path.is_file():
        return True
    LOG.info("First run: initializing working dir with defaults")
    try:
        subprocess.run(
            [sys.executable, "-m", "aicraw", "init", "--defaults", "--accept-security"],
            check=True,
            capture_output=True,
        )
        return True
    except subprocess.CalledProcessError as e:
        LOG.error("Init failed: %s", e.stderr.decode() if e.stderr else str(e))
        return False


def _run_server() -> None:
    """Run uvicorn in this thread (daemon)."""
    os.environ[LOG_LEVEL_ENV] = os.environ.get(LOG_LEVEL_ENV, "info")
    setup_logger(os.environ[LOG_LEVEL_ENV])
    write_last_api(HOST, PORT)

    import uvicorn

    uvicorn.run(
        "aicraw.app._app:app",
        host=HOST,
        port=PORT,
        reload=False,
        workers=1,
        log_level=os.environ.get(LOG_LEVEL_ENV, "info"),
    )


def _wait_for_server(timeout_sec: float = 30.0) -> bool:
    """Poll /api/version until server is ready or timeout."""
    deadline = time.monotonic() + timeout_sec
    while time.monotonic() < deadline:
        try:
            req = Request(VERSION_URL)
            with urlopen(req, timeout=1) as _:
                return True
        except (URLError, OSError):
            time.sleep(0.2)
    return False


def main() -> None:
    """Start LinClaw as a native desktop app: server in background, PyWebView window."""
    if not _ensure_init():
        sys.exit(1)

    server_thread = threading.Thread(target=_run_server, daemon=True)
    server_thread.start()

    if not _wait_for_server():
        LOG.error("Server did not start in time")
        sys.exit(1)

    import webview

    webview.create_window(
        "LinClaw",
        URL,
        width=1200,
        height=800,
        resizable=True,
    )
    webview.start()
