# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec for LinClaw Electron 后端（仅 uvicorn，无 pywebview）
# 输出到 python-dist/LinClaw/

import os
from PyInstaller.utils.hooks import collect_submodules

SPEC_DIR = os.path.dirname(os.path.abspath(SPEC))
REPO_ROOT = os.path.dirname(SPEC_DIR)  # packaging/ 的父目录

CONSOLE_SRC = os.path.join(REPO_ROOT, "src", "aicraw", "console")
AICRAW_SRC = os.path.join(REPO_ROOT, "src", "aicraw")

datas = []
if os.path.isdir(CONSOLE_SRC):
    datas.append((CONSOLE_SRC, "aicraw/console"))
for sub in ("agents/md_files", "agents/skills", "tokenizer"):
    src = os.path.join(AICRAW_SRC, sub)
    if os.path.isdir(src):
        datas.append((src, f"aicraw/{sub}"))

hiddenimports = [
    "aicraw.app._app",
    "aicraw.cli.init_cmd",
    "uvicorn.logging",
    "uvicorn.protocols.http",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.lifespan.on",
    "playwright.async_api",
    "agentscope",
    "agentscope_runtime",
    "click",
    "click.testing",
]
hiddenimports += collect_submodules("aicraw.app")

a = Analysis(
    [os.path.join(SPEC_DIR, "scripts", "run_server.py")],
    pathex=[REPO_ROOT],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["webview"],
    noarchive=False,
    optimize=0,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="LinClaw",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # 无终端窗口（由 Electron 管理）
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="LinClaw",
)
