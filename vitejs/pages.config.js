/**
 * @fileOverview Автосбор HTML-страниц из папки pages для Vite MPA input
 */
import { resolve, basename, relative } from 'path'
import { readdirSync, statSync } from 'fs'

const __dirname = import.meta.dirname
const pagesDir = resolve(__dirname, '../pages')

function collectHtmlFiles(dir) {
  const entries = readdirSync(dir)
  const result = []

  for (const entry of entries) {
    const fullPath = resolve(dir, entry)

    if (statSync(fullPath).isDirectory()) {
      result.push(...collectHtmlFiles(fullPath))
      continue
    }

    if (!entry.endsWith('.html')) continue

    const rel = relative(pagesDir, fullPath)
    const name = rel.replace(/\.html$/, '').replaceAll('\\', '/')

    console.log('name of the page', name);

    result.push({ name, path: fullPath })
  }

  return result
}

const pages = [
  { name: 'index', path: resolve(__dirname, '../index.html') },
  ...collectHtmlFiles(pagesDir),
]

export default pages