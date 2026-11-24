import { render } from 'preact'
import type { TextMeasure } from '../diagram/card-layout'
import { DiagramLayers } from '../diagram/components/DiagramLayers'
import type { Scene } from '../diagram/scene'
import type { DiagramTheme } from '../diagram/theme'
import { inflate, type Rect, type Size } from '../layout/geometry'

export type ExportFormat = 'svg' | 'png'

export type ExportedImage = {
  readonly data: string | ArrayBuffer
  readonly mimeType: string
  readonly extension: ExportFormat
}

type Diagram = {
  readonly scene: Scene
  readonly theme: DiagramTheme
  readonly measure: TextMeasure
}

const EXPORT_PADDING = 32
const SVG_MIME_TYPE = 'image/svg+xml'
const PNG_MIME_TYPE = 'image/png'
const PREFERRED_PNG_SCALE = 2
export const MIN_PNG_SCALE = 0.25
// Chromium refuses canvases past either limit, and toBlob then yields nothing.
const MAX_CANVAS_SIDE = 16384
const MAX_CANVAS_AREA = 268_435_456
const XML_INVALID_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g

export async function exportDiagram(
  format: ExportFormat,
  diagram: Diagram
): Promise<ExportedImage> {
  const svg = renderSvg(diagram)
  if (format === 'svg') return { data: svg.markup, mimeType: SVG_MIME_TYPE, extension: 'svg' }
  return { data: await rasterize(svg), mimeType: PNG_MIME_TYPE, extension: 'png' }
}

type RenderedSvg = {
  readonly markup: string
  readonly frame: Rect
}

/** The whole diagram as a standalone SVG document: no highlights, plain sRGB colors. */
function renderSvg({ scene, theme, measure }: Diagram): RenderedSvg {
  if (!scene.bounds) throw new Error('There is no diagram to export yet.')
  const frame = inflate(scene.bounds, EXPORT_PADDING)
  const container = document.createElement('div')
  const plainTheme = withResolvedColors(theme)
  render(
    <StandaloneDiagram scene={scene} theme={plainTheme} measure={measure} frame={frame} />,
    container
  )
  const svg = container.firstElementChild
  if (!svg) throw new Error('The diagram could not be drawn for export.')
  const markup = new XMLSerializer().serializeToString(svg)
  render(null, container)
  return {
    markup: `<?xml version="1.0" encoding="UTF-8"?>\n${markup.replace(XML_INVALID_CHARACTERS, '')}`,
    frame
  }
}

type StandaloneDiagramProps = Diagram & { readonly frame: Rect }

function StandaloneDiagram({ scene, theme, measure, frame }: StandaloneDiagramProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={frame.width}
      height={frame.height}
      viewBox={`${frame.x} ${frame.y} ${frame.width} ${frame.height}`}
    >
      <rect x={frame.x} y={frame.y} width={frame.width} height={frame.height} fill={theme.canvas} />
      <DiagramLayers scene={scene} theme={theme} measure={measure} />
    </svg>
  )
}

async function rasterize({ markup, frame }: RenderedSvg): Promise<ArrayBuffer> {
  const scale = pngScale(frame)
  if (scale < MIN_PNG_SCALE) {
    throw new Error('The diagram is too large for a PNG image. Export it as SVG instead.')
  }
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(frame.width * scale)
  canvas.height = Math.ceil(frame.height * scale)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('This frame cannot draw images.')
  context.drawImage(
    await loadImage(new Blob([markup], { type: SVG_MIME_TYPE })),
    0,
    0,
    canvas.width,
    canvas.height
  )
  return encodePng(canvas)
}

async function encodePng(canvas: HTMLCanvasElement): Promise<ArrayBuffer> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, PNG_MIME_TYPE))
  if (!blob) throw new Error('The browser could not encode the PNG image.')
  return blob.arrayBuffer()
}

/** How many PNG pixels per diagram unit: sharp, but within what a browser canvas allows. */
export function pngScale({ width, height }: Size): number {
  return Math.min(
    PREFERRED_PNG_SCALE,
    MAX_CANVAS_SIDE / width,
    MAX_CANVAS_SIDE / height,
    Math.sqrt(MAX_CANVAS_AREA / (width * height))
  )
}

async function loadImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    return image
  } finally {
    URL.revokeObjectURL(url)
  }
}

const MAX_CHANNEL = 255
const ALPHA_DECIMALS = 1000

// The live theme may hold CSS such as color-mix() or oklch(), which many SVG tools cannot read,
// and a canvas's fillStyle can echo them back as color(srgb …). Painting one pixel and reading its
// bytes always yields plain rgb(); values that are not colors, such as the font stacks, stay as
// they are.
function withResolvedColors(theme: DiagramTheme): DiagramTheme {
  const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('This frame cannot draw images.')
  const resolve = (value: string): string =>
    CSS.supports('color', value) ? paintedColor(context, value) : value
  return {
    ...theme,
    ...Object.fromEntries(Object.entries(theme).map(([key, value]) => [key, resolve(value)]))
  }
}

function paintedColor(context: CanvasRenderingContext2D, color: string): string {
  context.clearRect(0, 0, 1, 1)
  context.fillStyle = color
  context.fillRect(0, 0, 1, 1)
  const [red = 0, green = 0, blue = 0, alpha = 0] = context.getImageData(0, 0, 1, 1).data
  if (alpha === MAX_CHANNEL) return `rgb(${red}, ${green}, ${blue})`
  const opacity = Math.round((alpha / MAX_CHANNEL) * ALPHA_DECIMALS) / ALPHA_DECIMALS
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`
}
