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

## 三、修改 package.json

### 3.1 mac 签名与公证

在 `build.mac` 中增加（替换 `YOUR_TEAM_ID` 和证书名称）：

```json
"mac": {
  "identity": "Developer ID Application: Your Name (YOUR_TEAM_ID)",
  "notarize": {
    "teamId": "YOUR_TEAM_ID"
  }
}
```

- `identity`：必须与钥匙串中的证书名称完全一致
- `notarize.teamId`：10 位 Team ID
- 当前配置使用 `defaultArch: "universal"`，输出 universal 包（Intel + Apple Silicon）

### 3.2 DMG 签名（可选）

配置证书后，建议对 DMG 也签名，使安装包本身带证书。在 `build` 中修改 `dmg`：

```json
"dmg": {
  "sign": true,
  "contents": [
    { "x": 130, "y": 220 },
    { "x": 410, "y": 220, "type": "link", "path": "/Applications" }
  ]
}
```

- `sign: true`：使用与 `mac.identity` 相同的证书对 DMG 签名
- `contents`：DMG 窗口布局（应用图标与 Applications 链接位置），参考 qiniu-aistudio

---

## 四、打包流程

```bash
pnpm run build:python
pnpm run build:electron:mac
```

打包时会自动完成：签名 → 公证（约 5–15 分钟）→ 输出到 `release/`。

输出文件：`release/Aicraw-<版本>-universal.dmg`。

---

## 五、验证

```bash
# 从 DMG 安装后，或解压 release 中的 mac-universal 目录
# 验证签名
codesign -dvv /Applications/Aicraw.app

# 验证公证
spctl -a -vv -t install /Applications/Aicraw.app
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
