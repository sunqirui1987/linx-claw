#!/usr/bin/env node
/**
 * 构建 Python 后端供 Electron 打包
 * 输出: python-dist/LinClaw/ (供 electron-builder extraResources)
 * 使用 venv 避免 externally-managed-environment，生成的 exe 可在无 Python 的电脑上运行
 */
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const repoRoot = join(__dirname, '..')
const pythonDistDir = join(repoRoot, 'python-dist', 'LinClaw')
const venvDir = join(repoRoot, '.build-venv')
const exeName = process.platform === 'win32' ? 'LinClaw.exe' : 'LinClaw'
const exePath = join(pythonDistDir, exeName)
const force = process.argv.includes('--force')

if (!force && existsSync(exePath)) {
  console.log('[python-backend] Existing binary detected, skipping rebuild.')
  process.exit(0)
}

console.log('[python-backend] Building Python backend with PyInstaller...')

// 0. 创建/使用 venv（aicraw 要求 Python >=3.10,<=3.14，优先使用 3.12/3.11/3.10）
const PYTHON_CANDIDATES = process.platform === 'win32'
  ? ['python3.12', 'python3.11', 'python3.10', 'py', 'python']
  : ['python3', 'python3.10', 'python3.11', 'python3.12']

function findCompatiblePython() {
  const code = "import sys; sys.exit(0 if (3,10) <= sys.version_info < (3,15) else 1)"
  for (const cmd of PYTHON_CANDIDATES) {
    const fullCmd = cmd === 'py' ? `py -3.12 -c "${code}"` : `"${cmd}" -c "${code}"`
    const r = spawnSync(fullCmd, {
      stdio: 'pipe',
      shell: true, // 通过 shell 解析 PATH，与终端一致
    })
    if (r.status === 0) return cmd
  }
  return null
}

const venvPython = process.platform === 'win32'
  ? join(venvDir, 'Scripts', 'python.exe')
  : join(venvDir, 'bin', 'python')

// 若 venv 已存在，检查其 Python 版本是否兼容
let needVenv = !existsSync(venvPython)
if (!needVenv) {
  const check = spawnSync(venvPython, ['-c', "import sys; sys.exit(0 if (3,10) <= sys.version_info < (3,15) else 1)"], {
    stdio: 'pipe',
  })
  if (check.status !== 0) {
    console.log('[python-backend] Existing venv has incompatible Python, recreating...')
    const { rmSync } = await import('fs')
    rmSync(venvDir, { recursive: true, force: true })
    needVenv = true
  }
}

if (needVenv) {
  const pythonCmd = findCompatiblePython()
  if (!pythonCmd) {
    console.error('[python-backend] No Python >=3.10,<=3.14 found. Ensure python3 is in PATH (e.g. python3 -V works in your terminal).')
    process.exit(1)
  }
  console.log('[python-backend] Creating build venv with', pythonCmd, '...')
  const venvArgs = pythonCmd === 'py' ? ['-3.12', '-m', 'venv', venvDir] : ['-m', 'venv', venvDir]
  const venvCreate = spawnSync(pythonCmd, venvArgs, {
    cwd: repoRoot,
    stdio: 'inherit',
  })
  if (venvCreate.status !== 0) {
    console.error('[python-backend] Failed to create venv.')
    process.exit(venvCreate.status ?? 1)
  }
}

// 1. Build console
const consoleDir = join(repoRoot, 'console')
const consoleDest = join(repoRoot, 'src', 'aicraw', 'console')

console.log('[python-backend] Installing console dependencies...')
const pnpmInstall = spawnSync('pnpm', ['install', '--frozen-lockfile'], {
  cwd: consoleDir,
  stdio: 'inherit',
  shell: true, // Windows 上 pnpm.cmd 需要 shell 解析才能找到
})
if (pnpmInstall.status !== 0) {
  console.error('[python-backend] Console pnpm install failed.')
  process.exit(pnpmInstall.status ?? 1)
}

console.log('[python-backend] Building console frontend...')
const pnpmBuild = spawnSync('pnpm', ['run', 'build'], {
  cwd: consoleDir,
  stdio: 'inherit',
  shell: true, // Windows 上 pnpm.cmd 需要 shell 解析才能找到
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
// 使用 venv 内的 pip，避免 externally-managed-environment
console.log('[python-backend] Installing pyinstaller and aicraw in venv...')
const pipInstall = spawnSync(venvPython, ['-m', 'pip', 'install', 'pyinstaller', '.'], {
  cwd: repoRoot,
  stdio: 'inherit',
})
if (pipInstall.status !== 0) {
  console.error('[python-backend] pip install failed.')
  process.exit(pipInstall.status ?? 1)
}

const specPath = join(repoRoot, 'packaging', 'aicraw_electron.spec')
console.log('[python-backend] Running PyInstaller...')
const pyinstaller = spawnSync(venvPython, ['-m', 'PyInstaller', 
  '--noconfirm',
  '--clean',
  '--distpath',
  join(repoRoot, 'python-dist'),
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
