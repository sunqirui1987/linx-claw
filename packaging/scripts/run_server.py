#!/usr/bin/env python3
"""Electron 后端入口：仅启动 uvicorn 服务，不创建窗口。"""
from __future__ import annotations

import subprocess
import sys

from aicraw.constant import LOG_LEVEL_ENV
from aicraw.config.utils import get_config_path, write_last_api
from aicraw.utils.logging import setup_logger

HOST = "127.0.0.1"
PORT = 8088


def _ensure_init() -> bool:
    """若配置不存在则执行 aicraw init。"""
    if get_config_path().is_file():
        return True
    try:
        if getattr(sys, "frozen", False):
            # PyInstaller 打包：无系统 Python，直接调用 init 逻辑
            from click.testing import CliRunner

            from aicraw.cli.init_cmd import init_cmd

            runner = CliRunner()
            result = runner.invoke(init_cmd, ["--defaults", "--accept-security"])
            return result.exit_code == 0
        subprocess.run(
            [sys.executable, "-m", "aicraw", "init", "--defaults", "--accept-security"],
            check=True,
            capture_output=True,
        )
        return True
    except subprocess.CalledProcessError:
        return False


def main() -> None:
    if not _ensure_init():
        sys.exit(1)
    import os

    os.environ[LOG_LEVEL_ENV] = os.environ.get(LOG_LEVEL_ENV, "info")
    setup_logger(os.environ[LOG_LEVEL_ENV])
    write_last_api(HOST, PORT)

    import uvicorn

    # Use static import so PyInstaller can collect aicraw.app package reliably.
    try:
        from aicraw.app._app import app as fastapi_app
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)

    uvicorn.run(
        fastapi_app,
        host=HOST,
        port=PORT,
        reload=False,
        workers=1,
        log_level=os.environ.get(LOG_LEVEL_ENV, "info"),
    )


if __name__ == "__main__":
    main()
