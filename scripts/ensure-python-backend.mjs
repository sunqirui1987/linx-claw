#!/usr/bin/env node
/**
 * 构建 Python 后端供 Electron 打包
 * 参考 qiniu-aistudio 的 scripts/ensure-upload-cli.mjs
 * 输出: python-dist/Aicraw/ (供 electron-builder extraResources)
 */
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const repoRoot = join(__dirname, '..')
const pythonDistDir = join(repoRoot, 'python-dist', 'Aicraw')
const exeName = process.platform === 'win32' ? 'Aicraw.exe' : 'Aicraw'
const exePath = join(pythonDistDir, exeName)
const force = process.argv.includes('--force')

if (!force && existsSync(exePath)) {
  console.log('[python-backend] Existing binary detected, skipping rebuild.')
  process.exit(0)
}

console.log('[python-backend] Building Python backend with PyInstaller...')

// 1. Build console
const consoleDir = join(repoRoot, 'console')
const consoleDest = join(repoRoot, 'src', 'aicraw', 'console')

console.log('[python-backend] Building console frontend...')
const pnpmBuild = spawnSync('pnpm', ['run', 'build'], {
  cwd: consoleDir,
  stdio: 'inherit',
})
if (pnpmBuild.status !== 0) {
  console.error('[python-backend] Console build failed.')
  process.exit(pnpmBuild.status ?? 1)
}

console.log('[python-backend] Copying console/dist/* -> src/aicraw/console/...')
const { mkdirSync, rmSync, cpSync } = await import('fs')
mkdirSync(consoleDest, { recursive: true })
rmSync(consoleDest, { recursive: true, force: true })
cpSync(join(consoleDir, 'dist'), consoleDest, { recursive: true })

// 2. Run PyInstaller (使用 electron spec，无需 pywebview)
// 使用 python -m pip 确保与运行环境一致，不加 -q 以便失败时看到详细错误
const pythonCmd = process.platform === 'win32' ? 'python' : 'python3'
const pipInstall = spawnSync(pythonCmd, ['-m', 'pip', 'install', 'pyinstaller', '.'], {
  cwd: repoRoot,
  stdio: 'inherit',
})
if (pipInstall.status !== 0) {
  console.error('[python-backend] pip install failed.')
  process.exit(pipInstall.status ?? 1)
}

const specPath = join(repoRoot, 'packaging', 'aicraw_electron.spec')
const pyinstaller = spawnSync(pythonCmd, ['-m', 'PyInstaller', 
  '--noconfirm',
  '--clean',
  '--distpath',
  join(repoRoot, 'python-dist'),
  '--specpath',
  repoRoot,
  specPath,
], {
  cwd: repoRoot,
  stdio: 'inherit',
})

if (pyinstaller.status !== 0) {
  console.error('[python-backend] PyInstaller failed.')
  process.exit(pyinstaller.status ?? 1)
}

console.log('[python-backend] Python backend ready at', pythonDistDir)
