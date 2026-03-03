#!/usr/bin/env node
/**
 * 将 docs/ 下的图标同步到 build/，供 electron-builder 使用
 * 参考 qiniu-aistudio：build/ 目录存放 icon.icns / icon.ico / icon.png
 */
import { existsSync, mkdirSync, cpSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const repoRoot = join(__dirname, '..')
const docsDir = join(repoRoot, 'docs')
const buildDir = join(repoRoot, 'build')

const icons = ['icon.png', 'icon.icns', 'icon.ico']

mkdirSync(buildDir, { recursive: true })

for (const name of icons) {
  const src = join(docsDir, name)
  if (existsSync(src)) {
    cpSync(src, join(buildDir, name))
    console.log('[sync-icons] Copied', name)
  }
}
