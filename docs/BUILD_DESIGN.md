# Aicraw 桌面应用打包构建设计文档

> 目标：把 Aicraw 打包成一个普通用户双击即可安装的桌面应用，支持 Windows、Mac（Intel）、Mac（M 芯片），以及通过 Apple 的安全认证。

---

## 一、整体架构：三层嵌套

理解打包方案，首先要理解整个应用由三个部分组成：

```
┌──────────────────────────────────────────────────────┐
│  层 1：Electron 外壳                                   │
│  - 负责创建原生窗口（标题栏、关闭按钮等）              │
│  - 应用启动时：先把 Python 后端跑起来，再打开浏览器窗口  │
│  - 应用关闭时：同时关闭 Python 后端                    │
└───────────────────────┬──────────────────────────────┘
                        │  打开网页
                        ▼
┌──────────────────────────────────────────────────────┐
│  层 2：React 前端（console）                           │
│  - 用 React + Ant Design 写的 Web 界面                 │
│  - 打包后是一堆静态 HTML/JS/CSS 文件                   │
│  - 被嵌入到 Python 后端里一起提供服务                  │
└───────────────────────┬──────────────────────────────┘
                        │  API 调用 (HTTP)
                        ▼
┌──────────────────────────────────────────────────────┐
│  层 3：Python 后端（aicraw）                           │
│  - FastAPI + uvicorn，监听 127.0.0.1:8088             │
│  - 提供 /api/* 接口 + 托管 React 静态文件              │
│  - 包含所有 AI、Agent、调度等核心逻辑                  │
└──────────────────────────────────────────────────────┘
```

**用户视角**：安装后双击图标 → 窗口出现 → 后台自动运行 Python 服务 → 界面加载完毕。
用户感觉在用一个普通桌面应用，感知不到背后的三层结构。

---

## 二、打包要解决的核心问题

普通用户的电脑上没有 Python，也没有 Node.js。打包需要解决：

| 问题             | 解决方案                                                               |
| ---------------- | ---------------------------------------------------------------------- |
| 用户没有 Python  | 用 **PyInstaller** 把 Python 解释器 + 所有依赖打包成一个独立可执行文件 |
| 用户没有 Node.js | 用 **Electron** 把 Chromium + Node.js 内置进应用                       |
| 多平台格式不同   | Mac 用 `.dmg`，Windows 用 `.exe` 安装包，各平台分别构建                |
| Mac 安全限制     | 需要苹果开发者证书**签名**，并通过苹果服务器**公证**                   |

---

## 三、目录结构说明

```
linx-craw/
│
├── src/aicraw/            # Python 后端源码（aicraw 包）
│
├── console/               # React 前端源码
│   ├── src/               # React 组件、页面
│   └── package.json       # 前端依赖（React、Ant Design 等）
│
├── electron/              # Electron 主进程源码
│   ├── main.ts            # 主进程：启动 Python、创建窗口
│   └── preload.ts         # 预加载脚本：向网页暴露少量 Node API
│
├── packaging/             # 打包配置
│   ├── aicraw_electron.spec   # PyInstaller 配置（如何打包 Python）
│   └── scripts/run_server.py  # Python 打包后的入口脚本
│
├── scripts/               # 构建辅助脚本
│   ├── ensure-python-backend.mjs  # 一键构建 Python 可执行文件
│   ├── check-python-dist.mjs      # 检查 Python 产物是否存在
│   └── sync-icons.mjs             # 同步图标文件到 build/
│
├── build/                 # electron-builder 所需的静态资源
│   ├── icon.icns          # Mac 图标
│   ├── icon.ico           # Windows 图标
│   ├── icon.png           # Linux/通用图标
│   └── entitlements.mac.plist  # Mac 签名所需的权限声明
│
├── .github/workflows/
│   └── release.yml        # GitHub Actions 自动化发布流程
│
├── package.json           # 根包：Node 依赖 + electron-builder 配置
└── vite.electron.config.ts # Vite：把 main.ts/preload.ts 编译成 JS
```

---

## 四、构建流程：分三步走

完整的打包过程按顺序分三步：

```
第一步：构建 React 前端
console/ 源码
    │
    │  cd console && pnpm build
    ▼
console/dist/（HTML + JS + CSS 静态文件）
    │
    │  自动复制
    ▼
src/aicraw/console/（被 Python 服务静态托管）


第二步：打包 Python 后端
src/aicraw/（Python 包）+ src/aicraw/console/（前端静态文件）
    │
    │  PyInstaller
    ▼
python-dist/Aicraw/（包含 Python 解释器 + 所有依赖 + 前端文件）
    ├── Aicraw（或 Aicraw.exe）  ← 启动入口
    └── _internal/              ← 所有依赖库


第三步：打包 Electron 外壳
electron/main.ts + electron/preload.ts
    │
    │  Vite 编译
    ▼
dist-electron/（main.js + preload.mjs）
    │
    │  electron-builder
    ▼
release/
    ├── Aicraw-1.0.0-arm64.dmg   ← Mac M 芯片安装包
    ├── Aicraw-1.0.0.dmg         ← Mac Intel 安装包
    ├── Aicraw-1.0.0-Setup.exe   ← Windows 安装包
    └── Aicraw-1.0.0.exe         ← Windows 便携版（免安装）
```

最终安装包里的结构（以 Mac 为例）：

```
Aicraw.app/
└── Contents/
    ├── MacOS/Aicraw         ← Electron 可执行文件
    └── Resources/
        ├── app/             ← dist-electron/（Electron JS 代码）
        └── bin/aicraw/      ← python-dist/Aicraw/（整个 Python 后端）
            ├── Aicraw       ← Python 可执行文件
            └── _internal/   ← Python 依赖库
```

---

## 五、为什么 Mac 要分两个包

Mac 目前有两种处理器架构：

- **Intel (x64)**：2020 年之前的 Mac，以及部分 2021 款
- **Apple Silicon (arm64)**：M1、M2、M3、M4 系列

**理想方案是一个"通用包"（Universal Binary）同时兼容两种芯片。**

但项目中的 Python 后端依赖了大量 C 扩展库（`onnxruntime`、`playwright`、`uvicorn` 等），这些库打包时直接编译为当前 CPU 的机器码。PyInstaller 目前无法可靠地将两种架构的 Python 环境合并成一个通用包。

**因此采用分架构构建方案**，在不同类型的机器上分别打包：

| 构建机器                    | 输出文件                 | 适用用户             |
| --------------------------- | ------------------------ | -------------------- |
| Apple Silicon Mac（M 芯片） | `Aicraw-x.x.x-arm64.dmg` | M1/M2/M3/M4 Mac 用户 |
| Intel Mac                   | `Aicraw-x.x.x.dmg`       | Intel Mac 用户       |
| Windows x64                 | `Aicraw-x.x.x-Setup.exe` | Windows 用户         |

---

## 六、Apple 认证：签名与公证

### 为什么需要认证？

从 macOS 10.15 开始，苹果的 Gatekeeper 机制会拦截未认证的应用：

| 状态           | 用户安装体验                                 |
| -------------- | -------------------------------------------- |
| 无签名         | 弹窗："无法打开，因为它来自身份不明的开发者" |
| 有签名，无公证 | 弹窗："无法验证此 App 不包含恶意软件"        |
| 签名 + 公证 ✅ | 正常安装，无任何警告                         |

### 认证分两步

**第 1 步：代码签名（Code Signing）**

用苹果颁发的"Developer ID Application"证书，对 App 里的每一个可执行文件（包括 Python 的 .dylib 库文件）盖上数字签章。
类似给包裹贴上快递单，证明它是你发的。

```
开发者证书（存在 Mac 钥匙串中）
    │
    │  electron-builder 自动调用 codesign 命令
    ▼
Aicraw.app 内所有可执行文件 → 每个都打上签名
```

**特殊之处**：因为打包了 PyInstaller，`_internal/` 目录里有大量 `.dylib` 文件，需要在 `build/entitlements.mac.plist` 中声明特殊权限，允许加载未单独签名的库：

```xml
<!-- 关闭库验证：PyInstaller 打包的 .dylib 没有独立签名 -->
<key>com.apple.security.cs.disable-library-validation</key>
<true/>

<!-- 允许 JIT：Python 运行时需要动态生成代码 -->
<key>com.apple.security.cs.allow-jit</key>
<true/>
```

**第 2 步：公证（Notarization）**

签名后，把 App 上传到苹果的服务器自动扫描（检查恶意代码、签名完整性等）。苹果通过后会给 App 附上"公证凭证"，用户安装时 Gatekeeper 联网验证这个凭证。

```
签名后的 Aicraw.dmg
    │
    │  xcrun notarytool（electron-builder v25 内置）
    ▼
上传到苹果服务器（等待 5~15 分钟）
    │
    ▼
苹果返回 "Accepted"
    │
    │  xcrun stapler（electron-builder 自动执行）
    ▼
公证凭证写入 DMG 文件（离线也能验证）
```

### 需要哪些前提条件

1. **加入 Apple Developer Program**（$99/年）
2. 申请 **Developer ID Application** 类型的证书（注意不是 Mac App Store 证书）
3. 生成 App 专用密码（在 appleid.apple.com）

---

## 七、本地构建（开发者手册）

### 环境要求

| 工具    | 版本要求    | 用途                |
| ------- | ----------- | ------------------- |
| Python  | 3.10 ~ 3.14 | 构建 Python 后端    |
| Node.js | ≥ 20        | 构建前端和 Electron |
| pnpm    | 9           | 包管理器            |

### 第一步：安装 Node 依赖

```bash
# 在项目根目录执行
pnpm install
```

### 第二步：构建 Python 后端

```bash
pnpm run build:python
```

这个命令会自动：

1. 在项目根目录创建 `.build-venv/` 虚拟环境（避免污染系统 Python）
2. 构建 `console/` React 前端，复制到 `src/aicraw/console/`
3. 用 PyInstaller 打包 Python → 输出到 `python-dist/Aicraw/`

> 首次运行约 10~20 分钟（PyInstaller 需要分析所有依赖）。
> 二次运行若无变化可直接跳过（不带 `--force` 时自动检测）。

### 第三步：打包 Electron 安装包

```bash
# 根据当前 Mac 架构自动选择（推荐）
pnpm run build:electron:mac

# 明确指定 M 芯片
pnpm run build:electron:mac:arm64

# 明确指定 Intel
pnpm run build:electron:mac:x64

# Windows（在 Windows 机器上执行）
pnpm run build:electron:win
```

输出在 `release/` 目录。

### 本地调试（不打包）

```bash
# 先在另一个终端启动 Python 服务
python -m aicraw app

# 然后启动 Electron 开发模式
pnpm run dev:electron
```

---

## 八、自动化发布（GitHub Actions）

### 触发方式

推送版本标签即可触发：

```bash
git tag v1.0.0
git push origin v1.0.0
```

或在 GitHub 仓库页面手动触发（Actions → Build & Release → Run workflow）。

### 并行构建三个平台

`.github/workflows/release.yml` 会同时启动三个独立任务：

```
推送 v1.0.0 标签
    │
    ├──────────────────────────────────────────┐
    │                                          │
    ▼                          ▼               ▼
macos-14 (Apple Silicon)   macos-13 (Intel)   windows-latest
构建 arm64 包               构建 x64 包        构建 Win 包
    │                          │               │
    └──────────────┬───────────┘               │
                   └───────────────────────────┘
                   ▼
              汇总所有产物
              创建 GitHub Release（草稿）
              上传三个安装包
                   │
                   ▼
              人工审核后点"发布"→ 正式 Release
```

### 配置 GitHub Secrets

在仓库 **Settings → Secrets and variables → Actions** 中添加：

**macOS 签名（可选，无此配置时打包不签名）：**

| Secret 名称             | 获取方式                                                    |
| ----------------------- | ----------------------------------------------------------- |
| `APPLE_CERT_P12_BASE64` | 从钥匙串导出 .p12 证书，然后 `base64 -i cert.p12 \| pbcopy` |
| `APPLE_CERT_PASSWORD`   | 导出 .p12 时设置的密码                                      |
| `APPLE_ID`              | Apple ID 邮箱地址                                           |
| `APPLE_APP_PASSWORD`    | 在 appleid.apple.com 生成的"App 专用密码"                   |
| `APPLE_TEAM_ID`         | Developer 账户的 10 位 Team ID（如 `ABC1234567`）           |

**Windows 签名（可选）：**

| Secret 名称           | 说明                          |
| --------------------- | ----------------------------- |
| `WIN_CERT_P12_BASE64` | Windows 代码签名证书转 base64 |
| `WIN_CERT_PASSWORD`   | 证书密码                      |

> **不配置 Secrets 也能打包**，只是 Mac 用户安装时会有"无法验证"的警告，对内部测试版本是可以接受的。

---

## 九、关键文件速查

| 文件                                | 作用                                                  |
| ----------------------------------- | ----------------------------------------------------- |
| `package.json`                      | electron-builder 主配置：输出格式、图标路径、签名选项 |
| `vite.electron.config.ts`           | 把 TypeScript 的 Electron 主进程编译成 JS             |
| `electron/main.ts`                  | Electron 主进程：启动 Python、等待服务、创建窗口      |
| `electron/preload.ts`               | 向网页暴露 `platform`、`shell.openExternal` 等 API    |
| `packaging/aicraw_electron.spec`    | PyInstaller 配置：打包哪些文件、隐藏导入哪些模块      |
| `packaging/scripts/run_server.py`   | Python 打包后的启动入口，负责 init + 启动 uvicorn     |
| `build/entitlements.mac.plist`      | Mac 签名权限声明，允许 PyInstaller bundle 正常运行    |
| `scripts/ensure-python-backend.mjs` | 一键构建 Python 后端的 Node 脚本                      |
| `.github/workflows/release.yml`     | 三平台自动构建 + 发布工作流                           |

---

## 十、常见问题

**Q: 为什么应用启动慢？**

A: 首次启动时 Python 后端（PyInstaller bundle）需要解压内部文件到临时目录，Windows 上尤其明显（约 3~8 秒）。这是 PyInstaller "onedir" 模式的正常现象，后续启动会快一些（系统缓存）。

**Q: `pnpm run build:python` 报错 "No Python >=3.10 found"**

A: 确保系统安装了 Python 3.10~3.14，且 `python3 --version` 在终端中可用。
Windows 用户可通过 `py --version` 确认。

**Q: Mac 上安装后提示"已损坏，无法打开"**

A: 安装包没有经过签名 + 公证。两个解法：

1. 终端运行 `xattr -cr /Applications/Aicraw.app`（临时解除隔离，仅内部测试用）
2. 配置 Secrets，让 CI 构建带公证的正式包

**Q: electron-builder 报错 "No identity found"**

A: 本地打包时没有找到证书，但 `notarize` 配置为开启。确认 `package.json` 中 `"notarize": false`（本地默认），或在钥匙串中正确安装了证书。

**Q: Windows 安装包被杀毒软件拦截**

A: 未签名的 exe 容易被误报，配置 `WIN_CERT_P12_BASE64` 后构建的包有代码签名证书，误报率大幅下降。
