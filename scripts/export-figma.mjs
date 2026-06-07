/**
 * @fileOverview Экспорт данных макета Figma в design/figma/ через REST API
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')
const FIGMA_API = 'https://api.figma.com/v1'

function loadEnv() {
  const envPath = resolve(rootDir, '.env')

  if (!existsSync(envPath)) return

  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#')) continue

    const separatorIndex = trimmed.indexOf('=')

    if (separatorIndex === -1) continue

    const key = trimmed.slice(0, separatorIndex).trim()
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, '')

    process.env[key] = value
  }
}

function readConfig() {
  const configPath = resolve(__dirname, 'figma.config.json')
  const config = JSON.parse(readFileSync(configPath, 'utf8'))

  return {
    fileKey: process.env.FIGMA_FILE_KEY || config.fileKey,
    outputDir: resolve(rootDir, config.outputDir),
  }
}

async function figmaFetch(path, token) {
  const response = await fetch(`${FIGMA_API}${path}`, {
    headers: {
      'X-Figma-Token': token,
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Figma API ${response.status}: ${body}`)
  }

  return response.json()
}

function rgbaToCss(color, opacity = 1) {
  const red = Math.round(color.r * 255)
  const green = Math.round(color.g * 255)
  const blue = Math.round(color.b * 255)
  const alpha = color.a !== undefined ? color.a * opacity : opacity

  if (alpha < 1) {
    return `rgba(${red}, ${green}, ${blue}, ${Number(alpha.toFixed(3))})`
  }

  return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

function addColor(map, value, meta) {
  if (!value) return

  const key = value.toLowerCase()

  if (!map.has(key)) {
    map.set(key, {
      value,
      count: 0,
      contexts: new Set(),
      nodeNames: new Set(),
    })
  }

  const entry = map.get(key)

  entry.count += 1
  entry.contexts.add(meta.context)

  if (entry.nodeNames.size < 5) {
    entry.nodeNames.add(meta.nodeName)
  }
}

function collectPaints(map, paints, meta) {
  if (!Array.isArray(paints)) return

  for (const paint of paints) {
    if (paint.visible === false) continue

    if (paint.type === 'SOLID' && paint.color) {
      addColor(map, rgbaToCss(paint.color, paint.opacity ?? 1), meta)
    }

    if (paint.type === 'GRADIENT_LINEAR' && Array.isArray(paint.gradientStops)) {
      for (const stop of paint.gradientStops) {
        addColor(map, rgbaToCss(stop.color), {
          ...meta,
          context: `${meta.context}-gradient`,
        })
      }
    }
  }
}

function collectEffects(map, effects, meta) {
  if (!Array.isArray(effects)) return

  for (const effect of effects) {
    if (effect.visible === false) continue
    if (!effect.color) continue

    addColor(map, rgbaToCss(effect.color), {
      ...meta,
      context: `${meta.context}-${effect.type.toLowerCase()}`,
    })
  }
}

function walkNode(node, state, path = []) {
  const nodePath = [...path, node.name].join(' / ')
  const meta = {
    nodeName: node.name,
    nodeId: node.id,
    nodeType: node.type,
    path: nodePath,
  }

  collectPaints(state.colors, node.fills, { ...meta, context: 'fill' })
  collectPaints(state.colors, node.strokes, { ...meta, context: 'stroke' })
  collectPaints(state.colors, node.background, { ...meta, context: 'background' })
  collectEffects(state.colors, node.effects, meta)

  if (node.type === 'TEXT' && node.style) {
    const styleKey = [
      node.style.fontFamily,
      node.style.fontPostScriptName,
      node.style.fontWeight,
      node.style.fontSize,
      node.style.lineHeightPx,
      node.style.letterSpacing,
    ].join('|')

    if (!state.typography.has(styleKey)) {
      state.typography.set(styleKey, {
        fontFamily: node.style.fontFamily,
        fontPostScriptName: node.style.fontPostScriptName,
        fontWeight: node.style.fontWeight,
        fontSize: node.style.fontSize,
        lineHeightPx: node.style.lineHeightPx,
        letterSpacing: node.style.letterSpacing,
        textCase: node.style.textCase,
        count: 0,
        samples: new Set(),
      })
    }

    const typography = state.typography.get(styleKey)

    typography.count += 1

    if (typography.samples.size < 5) {
      typography.samples.add(node.characters?.slice(0, 80) || node.name)
    }

    if (Array.isArray(node.fills)) {
      for (const paint of node.fills) {
        if (paint.type === 'SOLID' && paint.color) {
          addColor(state.colors, rgbaToCss(paint.color, paint.opacity ?? 1), {
            ...meta,
            context: 'text',
          })
        }
      }
    }
  }

  if (['FRAME', 'SECTION', 'COMPONENT', 'COMPONENT_SET', 'GROUP'].includes(node.type)) {
    state.frames.push({
      id: node.id,
      name: node.name,
      type: node.type,
      width: node.absoluteBoundingBox?.width ?? null,
      height: node.absoluteBoundingBox?.height ?? null,
      path: nodePath,
    })
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      walkNode(child, state, [...path, node.name])
    }
  }
}

function serializeColors(map) {
  return [...map.values()]
    .map((entry) => ({
      value: entry.value,
      count: entry.count,
      contexts: [...entry.contexts],
      nodeNames: [...entry.nodeNames],
    }))
    .sort((left, right) => right.count - left.count)
}

function serializeTypography(map) {
  return [...map.values()]
    .map((entry) => ({
      fontFamily: entry.fontFamily,
      fontPostScriptName: entry.fontPostScriptName,
      fontWeight: entry.fontWeight,
      fontSize: entry.fontSize,
      lineHeightPx: entry.lineHeightPx,
      letterSpacing: entry.letterSpacing,
      textCase: entry.textCase,
      count: entry.count,
      samples: [...entry.samples],
    }))
    .sort((left, right) => right.count - left.count)
}

function writeJson(outputDir, fileName, data) {
  writeFileSync(
    resolve(outputDir, fileName),
    `${JSON.stringify(data, null, 2)}\n`,
    'utf8',
  )
}

async function fetchOptional(endpoint, token) {
  try {
    return await figmaFetch(endpoint, token)
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function main() {
  loadEnv()

  const token = process.env.FIGMA_TOKEN
  const { fileKey, outputDir } = readConfig()

  if (!token) {
    console.error('Не найден FIGMA_TOKEN. Создай файл .env в корне проекта.')
    process.exit(1)
  }

  mkdirSync(outputDir, { recursive: true })

  console.log(`Экспорт файла ${fileKey}...`)

  const [fileData, stylesData, variablesData] = await Promise.all([
    figmaFetch(`/files/${fileKey}`, token),
    fetchOptional(`/files/${fileKey}/styles`, token),
    fetchOptional(`/files/${fileKey}/variables/local`, token),
  ])

  const state = {
    colors: new Map(),
    typography: new Map(),
    frames: [],
  }

  for (const page of fileData.document.children) {
    walkNode(page, state, [])
  }

  const exportedAt = new Date().toISOString()

  writeJson(outputDir, 'meta.json', {
    exportedAt,
    fileKey,
    fileName: fileData.name,
    lastModified: fileData.lastModified,
    version: fileData.version,
    pages: fileData.document.children.map((page) => ({
      id: page.id,
      name: page.name,
    })),
  })

  writeJson(outputDir, 'colors.json', serializeColors(state.colors))
  writeJson(outputDir, 'typography.json', serializeTypography(state.typography))
  writeJson(outputDir, 'frames.json', state.frames.sort((left, right) => left.name.localeCompare(right.name, 'ru')))
  writeJson(outputDir, 'styles.json', stylesData)
  writeJson(outputDir, 'variables.json', variablesData)

  console.log(`Готово: ${outputDir}`)
  console.log(`- colors: ${state.colors.size}`)
  console.log(`- typography: ${state.typography.size}`)
  console.log(`- frames: ${state.frames.length}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
