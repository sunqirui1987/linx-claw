# macOS 应用签名与公证指南

参考 [qiniu-aistudio](https://github.com/qiniu/qiniu-aistudio) 的 `docs/06-macOS应用签名与公证完整指南.md`，实现可分发给他人的 macOS 安装包。

## 为什么需要签名和公证

| 场景 | 无签名/公证 | 有签名+公证 |
|------|-------------|-------------|
| 本机安装 | ✅ 可安装 | ✅ 可安装 |
| 他人安装 | ❌ "身份不明的开发者" / "应用已损坏" | ✅ 正常安装，无警告 |

macOS 10.15+ 的 Gatekeeper 要求：**代码签名** + **公证** 才能顺利分发。

---

## 前置条件

- **Apple Developer Program**：$99/年（[developer.apple.com](https://developer.apple.com)）
- macOS + Xcode Command Line Tools
- 证书类型：**Developer ID Application**（非 Mac App Distribution）

---

## 一、创建签名证书

1. **生成 CSR**：钥匙串访问 → 证书助理 → 从证书颁发机构请求证书 → 存储到磁盘
2. **申请证书**：登录 [Apple Developer](https://developer.apple.com/account) → Certificates → + → 选择 **Developer ID Application** → 上传 CSR
3. **安装证书**：双击下载的 `.cer`，导入钥匙串
4. **记录名称**：例如 `Developer ID Application: Your Name (TEAM_ID)`

```bash
# 查看本机可用签名身份
security find-identity -v -p codesigning
```

---

## 二、配置公证凭据

公证需要 **App 专用密码**（非 Apple ID 密码）：

1. 访问 [appleid.apple.com](https://appleid.apple.com) → 安全 → App 专用密码 → 生成
2. 推荐存入 Keychain：

```bash
xcrun notarytool store-credentials "AC_PASSWORD" \
  --apple-id "your-apple-id@email.com" \
  --team-id "YOUR_TEAM_ID" \
  --password "xxxx-xxxx-xxxx-xxxx"
```

---

## 三、package.json 配置

### 3.1 mac 签名配置（已预置）

`package.json` 中 `build.mac` 已配置好 Hardened Runtime 和 entitlements：

```json
"mac": {
  "hardenedRuntime": true,
  "entitlements": "build/entitlements.mac.plist",
  "entitlementsInherit": "build/entitlements.mac.plist",
  "notarize": false
}
```

- `notarize: false`：本地开发默认不公证，CI 通过命令行参数覆盖

### 3.2 本地打包（有证书）

```bash
# 1. 确保证书已在钥匙串中
security find-identity -v -p codesigning

# 2. 通过命令行传入 Team ID 启用公证
APPLE_ID="your@email.com" \
APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx" \
pnpm exec electron-builder --mac --arm64 \
  --config.mac.notarize.teamId=YOUR_TEAM_ID
```

### 3.3 CI 自动签名（GitHub Actions）

在仓库 **Settings → Secrets → Actions** 中添加：

| Secret 名称 | 说明 |
|-------------|------|
| `APPLE_CERT_P12_BASE64` | `base64 -i cert.p12 \| pbcopy` 得到的字符串 |
| `APPLE_CERT_PASSWORD` | P12 文件密码 |
| `APPLE_ID` | Apple ID 邮箱 |
| `APPLE_APP_PASSWORD` | App 专用密码 |
| `APPLE_TEAM_ID` | 10 位 Team ID |

推送 `v*` 标签后，`.github/workflows/release.yml` 自动完成：签名 → 公证 → 上传 Release。

---

## 四、打包流程

```bash
# 本地打包（无签名）
pnpm run build:python
pnpm run build:electron:mac:arm64   # M 芯片 Mac 上运行
pnpm run build:electron:mac:x64    # Intel Mac 上运行
```

输出文件：
- `release/LinClaw-<版本>-arm64.dmg` — Apple Silicon 版
- `release/LinClaw-<版本>.dmg` — Intel 版

---

## 五、验证

```bash
# 从 DMG 安装后，或解压 release 中的 mac-universal 目录
# 验证签名
codesign -dvv /Applications/LinClaw.app

# 验证公证
spctl -a -vv -t install /Applications/LinClaw.app
# 应显示：source=Notarized Developer ID
```

---

## 六、开发时禁用公证

若暂无 Apple Developer 账号，可仅做本地测试：

```json
"mac": {
  "identity": null,
  "notarize": false
}
```

此时打包可成功，但他人安装时仍会提示「身份不明」。

---

## 参考

- [qiniu-aistudio 完整指南](https://github.com/qiniu/qiniu-aistudio/blob/main/docs/06-macOS应用签名与公证完整指南.md)
- [electron-builder - Code Signing](https://www.electron.build/code-signing)
- [Apple - Notarizing macOS Software](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
