/**
 * LinClaw Electron 主进程
 * 参考 qiniu-aistudio 结构：启动时 spawn Python 后端，加载控制台 URL
 */
import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawn, ChildProcess } from 'child_process'
import { existsSync } from 'fs'
import { electronApp, is } from '@electron-toolkit/utils'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const HOST = '127.0.0.1'
const PORT = 8088
const APP_URL = `http://${HOST}:${PORT}`
const VERSION_URL = `${APP_URL}/api/version`

let mainWindow: BrowserWindow | null = null
let pythonProcess: ChildProcess | null = null

/** 获取打包后的 Python 可执行文件路径 */
function getPythonExecutablePath(): string | null {
  if (is.dev) {
    // 开发模式：使用系统 python -m aicraw app
    return null
  }
  const resourcesPath = process.resourcesPath
  const binDir = join(resourcesPath, 'bin', 'linclaw')
  const isWin = process.platform === 'win32'
  const exeName = isWin ? 'LinClaw.exe' : 'LinClaw'
  const exePath = join(binDir, exeName)
  if (existsSync(exePath)) {
    return exePath
  }
  return null
}

/** 启动 Python 后端 */
async function startPythonBackend(): Promise<boolean> {
  const exePath = getPythonExecutablePath()
  if (exePath) {
    console.log('[LinClaw] Starting bundled Python backend:', exePath)
    const binDir = dirname(exePath)
    pythonProcess = spawn(exePath, [], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
      cwd: binDir, // PyInstaller onedir 需在 exe 所在目录运行以加载 _internal
    })
    pythonProcess.stdout?.on('data', (d) => process.stdout.write(d.toString()))
    pythonProcess.stderr?.on('data', (d) => process.stderr.write(d.toString()))
    pythonProcess.on('error', (err) => console.error('[LinClaw] Python process error:', err))
    pythonProcess.on('exit', (code) => console.log('[LinClaw] Python process exited:', code))
  } else {
    // 开发模式：假设用户已手动运行 aicraw app
    console.log('[LinClaw] Dev mode: expecting aicraw app running at', APP_URL)
  }
  return true
}

/** 等待服务就绪 */
async function waitForServer(timeoutMs = 30000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(VERSION_URL)
      if (res.ok) return true
    } catch {
      await new Promise((r) => setTimeout(r, 300))
    }
  }
  return false
}

/** 停止 Python 后端 */
function stopPythonBackend(): void {
  if (pythonProcess && !pythonProcess.killed) {
    pythonProcess.kill('SIGTERM')
    pythonProcess = null
  }
}

const isAllowedExternalUrl = (url: string): boolean => {
  try {
    return ['http:', 'https:', 'mailto:'].includes(new URL(url).protocol)
  } catch {
    return false
  }
}

function createWindow(): void {
  const preloadPath = join(__dirname, 'preload.mjs')

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    if (is.dev) mainWindow?.webContents.openDevTools()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!isAllowedExternalUrl(url)) return { action: 'deny' }
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.loadURL(APP_URL)
}

ipcMain.handle('shell:openExternal', (_event, url: string) => shell.openExternal(url))

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.linclaw.desktop')

  await startPythonBackend()
  const ready = await waitForServer()
  if (!ready) {
    console.error('[LinClaw] Backend did not start in time. Make sure aicraw app is running in dev mode.')
    if (!is.dev) {
      app.quit()
      return
    }
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  stopPythonBackend()
})
