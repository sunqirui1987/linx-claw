#!/usr/bin/env node
/**
 * 检查 python-dist 是否存在，供 Electron 打包前使用
 * 需先运行 pnpm run build:python 生成 Python exe
 */
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const repoRoot = join(__dirname, '..')
const pythonDistDir = join(repoRoot, 'python-dist', 'LinClaw')
const targetArg = process.argv.find((arg) => arg.startsWith('--target='))
const targetPlatform = targetArg ? targetArg.split('=')[1] : process.platform
const exeName = targetPlatform === 'win32' ? 'LinClaw.exe' : 'LinClaw'
const exePath = join(pythonDistDir, exeName)

if (targetPlatform !== process.platform) {
  console.error(
    `[check-python-dist] 目标平台 ${targetPlatform} 与当前平台 ${process.platform} 不一致，` +
    'Python 后端不可跨平台复用。请在目标平台先运行: pnpm run build:python',
  )
  process.exit(1)
}

if (!existsSync(exePath)) {
  console.error('[check-python-dist] Python 可执行文件不存在:', exePath)
  console.error('[check-python-dist] 请先运行: pnpm run build:python')
  process.exit(1)
}

console.log('[check-python-dist] OK:', exePath)
