import type { RefObject } from 'preact'
import { useMemo, useState } from 'preact/hooks'
import type { Point, Size } from '../../layout/geometry'
import type { TextMeasure } from '../card-layout'
import type { HitTarget } from '../dom'
import { emphasisFor, type Emphasis } from '../emphasis'
import type { Step } from '../navigation'
import type { Scene } from '../scene'
import type { DiagramTheme } from '../theme'
import { visibleWorld, type Viewport, type ViewportUpdate } from '../viewport'
import '../diagram.css'
import { DiagramLayers } from './DiagramLayers'
import type { CardDetail } from './TableCard'
import { KEYBOARD_HELP, useCanvasGestures } from './use-canvas-gestures'

export type DiagramCanvasProps = {
  readonly canvasRef: RefObject<SVGSVGElement | null>
  readonly screen: Size
  readonly scene: Scene
  readonly theme: DiagramTheme
  readonly measure: TextMeasure
  readonly viewport: Viewport
  readonly selectedKey: string | null
  readonly onViewportChange: (update: ViewportUpdate) => void
  readonly onZoomBy: (factor: number) => void
  readonly onNodeMove: (nodeKey: string, position: Point) => void
  readonly onNodeMoveEnd: () => void
  readonly onSelect: (nodeKey: string | null) => void
  readonly onOpen: (nodeKey: string) => void
  readonly onStep: (step: Step) => void
  readonly onFit: () => void
}

const GRID_PATTERN_ID = 'dbml-grid'
const GRID_SPACING = 24
const MIN_GRID_SCREEN_SPACING = 12
const GRID_DOT_RADIUS = 1
const OUTLINE_BELOW_ZOOM = 0.4
const INSTRUCTIONS = `Entity relationship diagram. ${KEYBOARD_HELP}`

// Lowercase on purpose: Preact sets `tabIndex` as an attribute, and on an SVG element the browser
// keeps that camelCase name, so the canvas would never take keyboard focus.
const CANVAS_ATTRIBUTES = {
  class: 'canvas',
  tabindex: 0,
  role: 'application',
  'aria-roledescription': 'diagram',
  'aria-label': INSTRUCTIONS
} as const

export function DiagramCanvas(props: DiagramCanvasProps) {
  const { gestures, emphasis } = useCanvasInteraction(props)
  return (
    <>
      <svg ref={props.canvasRef} {...CANVAS_ATTRIBUTES} {...gestures}>
        <GridBackground viewport={props.viewport} color={props.theme.grid} />
        <CanvasWorld {...props} emphasis={emphasis} />
      </svg>
      <SelectionAnnouncement scene={props.scene} selectedKey={props.selectedKey} />
    </>
  )
}

function useCanvasInteraction(props: DiagramCanvasProps) {
  const { scene, selectedKey } = props
  const [hover, setHover] = useState<HitTarget | null>(null)
  const emphasis = useMemo(
    () => emphasisFor(scene, hover, selectedKey),
    [scene, hover, selectedKey]
  )
  const gestures = useCanvasGestures({
    ...props,
    positionOf: (key) => scene.nodeRects.get(key) ?? null,
    onOpenSelected: () => {
      if (selectedKey !== null) props.onOpen(selectedKey)
    },
    onHover: (next) => setHover((current) => (sameTarget(current, next) ? current : next))
  })
  return { gestures, emphasis }
}

type CanvasWorldProps = Pick<
  DiagramCanvasProps,
  'scene' | 'theme' | 'measure' | 'viewport' | 'screen' | 'selectedKey'
> & { readonly emphasis: Emphasis | null }

function CanvasWorld(props: CanvasWorldProps) {
  const { scene, theme, measure, viewport, screen, selectedKey, emphasis } = props
  const visibleArea = screen.width > 0 ? visibleWorld(viewport, screen) : null
  const detail: CardDetail = viewport.zoom < OUTLINE_BELOW_ZOOM ? 'outline' : 'full'
  return (
    <g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.zoom})`}>
      <DiagramLayers
        scene={scene}
        theme={theme}
        measure={measure}
        emphasis={emphasis}
        selectedKey={selectedKey}
        interactive
        visibleArea={visibleArea}
        detail={detail}
      />
    </g>
  )
}

function SelectionAnnouncement({
  scene,
  selectedKey
}: Pick<DiagramCanvasProps, 'scene' | 'selectedKey'>) {
  return (
    <div class="visually-hidden" aria-live="polite">
      {selectionAnnouncement(scene, selectedKey)}
    </div>
  )
}

/** The dot spacing doubles as the view zooms out, so the dots never crowd into noise. */
function gridSpacing(zoom: number): number {
  let spacing = GRID_SPACING * zoom
  while (spacing < MIN_GRID_SCREEN_SPACING) spacing *= 2
  return spacing
}

function GridBackground({
  viewport,
  color
}: {
  readonly viewport: Viewport
  readonly color: string
}) {
  return (
    <>
      <GridPattern viewport={viewport} color={color} />
      <rect width="100%" height="100%" fill={`url(#${GRID_PATTERN_ID})`} />
    </>
  )
}

function GridPattern({ viewport, color }: { readonly viewport: Viewport; readonly color: string }) {
  const spacing = gridSpacing(viewport.zoom)
  return (
    <defs>
      <pattern
        id={GRID_PATTERN_ID}
        patternUnits="userSpaceOnUse"
        x={viewport.x}
        y={viewport.y}
        width={spacing}
        height={spacing}
      >
        <circle cx={spacing / 2} cy={spacing / 2} r={GRID_DOT_RADIUS} fill={color} />
      </pattern>
    </defs>
  )
}

function sameTarget(a: HitTarget | null, b: HitTarget | null): boolean {
  return a?.kind === b?.kind && a?.id === b?.id
}

function selectionAnnouncement(scene: Scene, selectedKey: string | null): string {
  const view = scene.tables.find((candidate) => candidate.table.key === selectedKey)
  if (!view) return ''
  const columns = view.table.columns.length
  return `${view.table.displayName}, ${columns} ${columns === 1 ? 'column' : 'columns'}`
}
