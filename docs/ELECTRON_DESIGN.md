# Electron + Python 设计方案

## 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│  Electron Main Process                                            │
│  - 启动时执行 aicraw init（若 ~/.aicraw 无 config）                │
│  - spawn: python -m aicraw app                                    │
│  - 等待 http://127.0.0.1:8088/api/version 就绪                     │
│  - 打开 BrowserWindow → http://127.0.0.1:8088                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Python 子进程 (aicraw app)                                       │
│  - 加载 ~/.aicraw/envs.json → os.environ                          │
│  - 加载 .env (python-dotenv)                                      │
│  - uvicorn 监听 127.0.0.1:8088                                    │
│  - 提供 /api/* 和静态 console                                    │
└─────────────────────────────────────────────────────────────────┘
```

## 环境变量 (env) 加载流程

1. **Electron 侧**：`spawn` 时传入 `{ ...process.env }`，继承当前环境
2. **Python 侧**（`aicraw app` 启动时）：
   - `load_envs_into_environ()` 从 `envs.json` 加载到 `os.environ`
   - `python-dotenv` 从 `~/.aicraw/.env` 加载（若存在）
   - `AICRAW_WORKING_DIR` 可指定工作目录（默认 `~/.aicraw`）

## 目录结构

```
CoPaw/
├── electron/
│   ├── main.js          # Electron 主进程
│   └── package.json    # electron 依赖与构建配置
├── console/             # React 前端（build 后由 Python 服务）
├── src/aicraw/          # Python 后端
└── docs/
    └── ELECTRON_DESIGN.md
```

## 运行方式

### 开发模式

```bash
# 1. 确保 aicraw 已安装
pip install -e .

# 2. 构建 console（可选，Python 会 serve 已构建的静态文件）
cd console && pnpm build && cd ..

# 3. 启动 Electron
cd electron && pnpm install && pnpm start
```

### 环境变量

| 变量 | 说明 |
|------|------|
| `AICRAW_WORKING_DIR` | 工作目录，默认 `~/.aicraw` |
| `AICRAW_PYTHON` | 指定 Python 可执行路径，默认 `python3` |
| `AICRAW_LOG_LEVEL` | 日志级别，默认 `info` |

## 打包策略

**当前**：Electron 只打包 UI 壳，Python 需用户本机安装（`pip install aicraw`）。

**可选扩展**：
- 用 PyInstaller 打包 `aicraw` 为独立可执行文件
- Electron 在 `resources/` 中附带该可执行文件
- `main.js` 根据 `app.isPackaged` 选择调用 `resources/aicraw` 或 `python -m aicraw`

## 与 PyWebView 方案对比

| 方面 | PyWebView + PyInstaller | Electron |
|------|-------------------------|----------|
| 打包 | 单一体积较大的 Python 包 | Electron 壳 + 需预装 Python 或 bundled Python |
| 跨平台 | 需各平台分别打包 | electron-builder 统一配置 |
| 前端技术栈 | 无 | 与 console 一致，可复用 Node 生态 |
| 原生能力 | 有限 | 丰富（系统托盘、通知、自动更新等） |
