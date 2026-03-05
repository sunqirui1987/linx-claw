# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**LinClaw**（包名 `aicraw`）是基于 [AgentScope](https://github.com/modelscope/agentscope) 构建的 AI 个人助理。运行本地 FastAPI 后端并提供 Web 控制台，支持多种消息渠道（钉钉、飞书、QQ、Discord、iMessage）。同时提供 Electron 桌面客户端，内嵌打包后的 Python 后端。

**用户数据目录：** `~/.aicraw/`（配置、记忆、技能、对话、定时任务）

---

## 常用命令

### Python 后端

```bash
# 以开发模式安装
pip install -e ".[dev]"

# 启动服务（默认：http://127.0.0.1:8088）
aicraw app

# 带参数启动
aicraw app --host 0.0.0.0 --port 8088 --reload --log-level debug

# 其他 CLI 命令
aicraw init        # 初始化工作目录
aicraw skills      # 管理技能
aicraw providers   # 管理模型提供商
aicraw channels    # 管理渠道
aicraw cron        # 管理定时任务
aicraw env         # 管理环境变量
aicraw chats       # 查看对话历史

# 运行测试
.venv/bin/pytest
.venv/bin/pytest tests/path/to/test_file.py  # 单个文件
.venv/bin/pytest -m "not slow"               # 跳过慢速测试
```

### 控制台前端（React + Vite，位于 `console/`）

```bash
cd console
pnpm install
pnpm run dev        # 开发服务器（含热更新）
pnpm run build      # 生产构建 -> console/dist/
pnpm run lint       # ESLint
pnpm run format     # Prettier

# 构建后复制到 Python 包：
cp -R dist/* ../src/aicraw/console/
```

### Electron 桌面应用（根目录包）

```bash
pnpm install

# 开发模式（需在另一个终端先运行 aicraw app）
pnpm run dev:electron

# 两步打包流程
pnpm run build:python          # 将 Python 打包至 python-dist/LinClaw/
pnpm run build:electron:mac    # 打包 macOS
pnpm run build:electron:win    # 打包 Windows

# 清理所有构建产物
rm -rf release python-dist .build-venv dist dist-electron build console/dist
```

### 官网（`www/` — Next.js）

```bash
cd www
pnpm install
pnpm run dev    # Next.js 开发服务器
pnpm run build  # 生产构建
pnpm run lint   # ESLint
```

---

## 架构说明

项目由四个独立子系统组成：

### 1. Python 后端（`src/aicraw/`）

使用 uvicorn 运行的 FastAPI 应用（`app/_app.py`）。入口：`aicraw app` → `cli/app_cmd.py`。

核心模块：

- **`app/_app.py`** — FastAPI 应用工厂；lifespan 中启动 Runner、ChannelManager、CronManager、ChatManager、MCP 客户端、ConfigWatcher
- **`app/routers/`** — REST API 端点，挂载于 `/api`
- **`app/channels/`** — 消息渠道集成（钉钉、飞书、QQ、Discord、iMessage、Console）；每个渠道是 `BaseChannel` 子类
- **`app/runner/`** — `AgentRunner` 管理每个会话的 `AicrawAgent` 实例和对话状态
- **`app/crons/`** — 基于 APScheduler 的定时任务，存储于 `~/.aicraw/jobs.json`
- **`app/mcp/`** — MCP（模型上下文协议）客户端管理器，支持通过 `MCPConfigWatcher` 热重载
- **`agents/react_agent.py`** — `AicrawAgent` 继承自 AgentScope 的 `ReActAgent`；集成内置工具（Shell、文件操作、浏览器、截图）、动态技能、记忆压缩以及命令处理（`/compact`、`/new` 等）
- **`agents/skills/`** — 随包附带的内置技能；激活的技能位于 `~/.aicraw/active_skills/`
- **`agents/memory/`** — 记忆管理，包含 `MemoryManager` 和 `AicrawInMemoryMemory`
- **`config/config.py`** — `~/.aicraw/config.json` 的 Pydantic 模型；涵盖渠道、MCP 客户端、Agent 设置、心跳
- **`providers/`** — LLM 提供商注册表（OpenAI 兼容、DashScope/七牛、Ollama 等）
- **`local_models/`** — 本地模型后端（llama.cpp、适用于 Apple Silicon 的 MLX）
- **`openai/`** — OpenAI 兼容的 `/v1/chat/completions` 端点

**数据流：** 用户消息 → 渠道 → `AgentRunner.process()` → `AicrawAgent.reply()` → ReAct 循环（工具 + 技能）→ 渠道发送响应

**配置热重载：** `~/.aicraw/config.json` 由 `ConfigWatcher` 和 `MCPConfigWatcher` 监听，无需重启即可生效。

### 2. 控制台前端（`console/`）

React 18 + Vite + TypeScript SPA。使用 Ant Design X（`@agentscope-ai/chat`）作为聊天 UI。状态管理使用 Zustand，路由使用 react-router-dom，国际化使用 i18next。

构建输出（`console/dist/`）复制到 `src/aicraw/console/`，由 FastAPI 应用作为静态文件提供服务。

### 3. Electron 桌面应用（根目录）

`electron/main.ts`（由 Vite 编译为 `dist-electron/main.js`）：

- **开发模式**：期望 `aicraw app` 在 `http://127.0.0.1:8088` 运行，加载该 URL
- **生产模式**：从 `resources/bin/linclaw/` 启动打包的 `python-dist/LinClaw/LinClaw` 二进制文件

Python 二进制文件由 `scripts/ensure-python-backend.mjs` 在隔离的 `.build-venv` 中通过 PyInstaller 构建。spec 文件：`packaging/aicraw_electron.spec`。

### 4. 官网（`www/`）

Next.js 16 + React 19 + Tailwind CSS 4 + shadcn/ui 站点。包含视觉/动画组件（ReactBits 风格），与主应用相互独立。

---

## 关键环境变量

| 环境变量                      | 默认值      | 说明                       |
| ----------------------------- | ----------- | -------------------------- |
| `AICRAW_WORKING_DIR`          | `~/.aicraw` | 用户数据目录               |
| `AICRAW_LOG_LEVEL`            | `info`      | 日志级别                   |
| `AICRAW_CONSOLE_REQUIRE_AUTH` | `true`      | `/api/*` 需要 Bearer Token |
| `AICRAW_CORS_ORIGINS`         | ``          | 逗号分隔的 CORS 来源       |
| `AICRAW_OPENAPI_DOCS`         | `false`     | 是否暴露 `/docs`、`/redoc` |
| `ENABLE_MEMORY_MANAGER`       | `true`      | 启用 Agent 记忆管理器      |
| `AICRAW_CONSOLE_STATIC_DIR`   | （自动）    | 覆盖控制台静态文件目录     |

`console` 渠道默认始终启用。LLM 提供商可通过 `aicraw providers` CLI 或控制台 Web 界面的设置页面进行配置。
