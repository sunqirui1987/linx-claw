/**
 * LinClaw Electron Preload
 * 暴露基础 API 给渲染进程（当前主要为加载远程 URL，可扩展）
 */
import { contextBridge, ipcRenderer } from 'electron'

const electronAPI = {
  platform: process.platform,
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
