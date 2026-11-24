import { TEXT_STYLES, type TextMeasure, type TextStyle } from './card-layout'
import type { DiagramTheme } from './theme'

type Fonts = Pick<DiagramTheme, 'fontSans' | 'fontMono'>

export type FontAttributes = {
  readonly 'font-family': string
  readonly 'font-size': number
  readonly 'font-weight': number
}

const MAX_CACHED_MEASUREMENTS = 5000

export function fontAttributes(style: TextStyle, fonts: Fonts): FontAttributes {
  const { family, size, weight } = fontOf(style, fonts)
  return { 'font-family': family, 'font-size': size, 'font-weight': weight }
}

function fontOf(style: TextStyle, fonts: Fonts) {
  const { size, weight, mono } = TEXT_STYLES[style]
  return { family: mono ? fonts.fontMono : fonts.fontSans, size, weight }
}

export function canvasTextMeasure(fonts: Fonts): TextMeasure {
  const context = document.createElement('canvas').getContext('2d')
  if (!context) throw new Error('The diagram needs a 2D canvas to measure text')
  const cache = new Map<string, number>()
  return (text, style) => {
    const key = `${style}\u0000${text}`
    const cached = cache.get(key)
    if (cached !== undefined) return cached
    if (cache.size >= MAX_CACHED_MEASUREMENTS) cache.clear()
    const { family, size, weight } = fontOf(style, fonts)
    context.font = `${weight} ${size}px ${family}`
    const width = context.measureText(text).width
    cache.set(key, width)
    return width
  }
}
