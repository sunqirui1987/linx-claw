# Aicraw

基于七牛云的 AI 个人助理，支持钉钉、飞书、QQ 等多端接入。

![LinCraw Chat](docs/image.png)

## 安装

```bash
git clone https://github.com/sunqirui1987/linx-craw.git
cd linx-craw
pip install -e .
cd console && pnpm install && pnpm run build
cp -R dist/* ../src/aicraw/console/
```

需要 Python 3.10+、Node.js 20+、pnpm。

## 快速开始

```bash
aicraw app
```

浏览器打开 http://127.0.0.1:8088/ 使用控制台。

## Electron 桌面客户端

参考 [qiniu-aistudio](https://github.com/qiniu/qiniu-aistudio) 结构，提供 Electron 客户端，内嵌打包后的 Python 后端。

### 开发模式

```bash
# 终端 1：先启动 Python 后端
aicraw app

# 终端 2：启动 Electron
pnpm install
pnpm approve-builds  # 若 Electron 未正确安装，执行此命令后重新 pnpm install
pnpm run dev:electron
```

### 打包（含 Python）

**两步流程**：先编译 Python 为 exe，再打包 Electron。

```bash
pnpm install

# 第一步：编译 Python 为可执行文件（需在目标平台执行，如打 Windows 包请在 Windows 上运行）
pnpm run build:python

# 第二步：打包 Electron
pnpm run build:electron        # 当前平台
pnpm run build:electron:mac   # macOS
pnpm run build:electron:win   # Windows
```

输出在 `release/` 目录。`build:python` 会构建 console、复制到 `src/aicraw/console`、用 PyInstaller 打包 Python 到 `python-dist/Aicraw`；`build:electron:*` 将 `python-dist` 与 Electron 一起打包。

## 七牛云配置

使用七牛云大模型（qnaigc）时，在控制台 **设置 → 模型** 中选择 Qiniu MaaS，填入 API Key 即可。请先 [登录七牛控制台](https://portal.qiniu.com/ai-inference/api-key) 获取 API Key。
