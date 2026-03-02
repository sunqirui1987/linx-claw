/**
 * Electron main process: spawns Python (aicraw app) and opens window.
 *
 * Architecture:
 * - Electron main process spawns `python -m aicraw app` (or bundled aicraw)
 * - Python loads env from ~/.aicraw (envs.json, .env) and runs uvicorn on 127.0.0.1:8088
 * - BrowserWindow loads http://127.0.0.1:8088
 */

const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

const HOST = '127.0.0.1';
const PORT = 8088;
const VERSION_URL = `http://${HOST}:${PORT}/api/version`;
const APP_URL = `http://${HOST}:${PORT}`;

/** @type {import('child_process').ChildProcess | null} */
let pythonProcess = null;

/**
 * Get Python executable path.
 * - Dev: use system python3 or python
 * - Prod: can use bundled Python or assume in PATH
 */
function getPythonPath() {
  if (process.env.AICRAW_PYTHON) {
    return process.env.AICRAW_PYTHON;
  }
  return process.platform === 'win32' ? 'python' : 'python3';
}

/**
 * Ensure ~/.aicraw exists and has config. If not, run aicraw init.
 * Returns true if ready.
 */
function ensureInit() {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const workingDir = process.env.AICRAW_WORKING_DIR || path.join(home, '.aicraw');
  const configPath = path.join(workingDir, 'config.json');

  if (fs.existsSync(configPath)) {
    return Promise.resolve(true);
  }

  console.log('[electron] First run: initializing working dir...');
  const python = getPythonPath();
  const init = spawn(python, ['-m', 'aicraw', 'init', '--defaults', '--accept-security'], {
    env: { ...process.env, AICRAW_WORKING_DIR: workingDir },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  return new Promise((resolve) => {
    let stderr = '';
    init.stderr?.on('data', (d) => { stderr += d.toString(); });
    init.on('close', (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        console.error('[electron] Init failed:', stderr);
        resolve(false);
      }
    });
  });
}

/**
 * Wait for Python server to be ready.
 */
function waitForServer(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;

  function tryFetch() {
    return new Promise((resolve) => {
      const req = http.get(VERSION_URL, { timeout: 2000 }, (res) => {
        res.resume();
        resolve(true);
      });
      req.on('error', () => resolve(false));
    });
  }

  return new Promise(async (resolve) => {
    while (Date.now() < deadline) {
      if (await tryFetch()) {
        resolve(true);
        return;
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    resolve(false);
  });
}

/**
 * Get repo root (parent of electron/) for dev. In packaged app, use app path.
 */
function getRepoRoot() {
  if (app.isPackaged) {
    return path.dirname(app.getPath('exe'));
  }
  return path.resolve(__dirname, '..');
}

/**
 * Spawn Python aicraw app.
 */
function startPythonServer() {
  const python = getPythonPath();
  const args = ['-m', 'aicraw', 'app'];
  const repoRoot = getRepoRoot();
  const consoleDist = path.join(repoRoot, 'console', 'dist');

  const env = {
    ...process.env,
    AICRAW_LOG_LEVEL: process.env.AICRAW_LOG_LEVEL || 'info',
  };
  if (fs.existsSync(consoleDist)) {
    env.AICRAW_CONSOLE_STATIC_DIR = consoleDist;
  }

  pythonProcess = spawn(python, args, {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: repoRoot,
  });

  pythonProcess.stdout?.on('data', (d) => process.stdout.write(d.toString()));
  pythonProcess.stderr?.on('data', (d) => process.stderr.write(d.toString()));

  pythonProcess.on('error', (err) => {
    console.error('[electron] Python spawn error:', err);
  });

  pythonProcess.on('exit', (code, signal) => {
    pythonProcess = null;
    if (code !== null && code !== 0) {
      console.log('[electron] Python exited:', code, signal);
    }
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.loadURL(APP_URL);
  win.on('closed', () => {
    if (pythonProcess) {
      pythonProcess.kill('SIGTERM');
      pythonProcess = null;
    }
  });
}

app.whenReady().then(async () => {
  const ok = await ensureInit();
  if (!ok) {
    app.quit();
    return;
  }

  startPythonServer();

  const ready = await waitForServer();
  if (!ready) {
    console.error('[electron] Server did not start in time');
    app.quit();
    return;
  }

  createWindow();
});

app.on('window-all-closed', () => {
  if (pythonProcess) {
    pythonProcess.kill('SIGTERM');
    pythonProcess = null;
  }
  app.quit();
});
