import type {
  RefObject,
  TargetedKeyboardEvent,
  TargetedMouseEvent,
  TargetedPointerEvent,
  TargetedWheelEvent
} from 'preact'
import { useMemo, useRef } from 'preact/hooks'
import type { Point } from '../../layout/geometry'
import { capturePointer } from '../../pointer-capture'
import { hitTargetAt, nodeKeyAt, type HitTarget } from '../dom'
import type { Step } from '../navigation'
import { panBy, ZOOM_STEP, zoomAt, type Viewport, type ViewportUpdate } from '../viewport'

export type CanvasActions = {
  readonly viewport: Viewport
  positionOf(nodeKey: string): Point | null
  onViewportChange(update: ViewportUpdate): void
  onZoomBy(factor: number): void
  onNodeMove(nodeKey: string, position: Point): void
  onNodeMoveEnd(): void
  onSelect(nodeKey: string | null): void
  onOpen(nodeKey: string): void
  onOpenSelected(): void
  onStep(step: Step): void
  onHover(target: HitTarget | null): void
  onFit(): void
}

type Press = { readonly pointerId: number; readonly origin: Point; readonly moved: boolean }

type Gesture =
  | { readonly kind: 'idle' }
  | (Press & { readonly kind: 'pan'; readonly start: Viewport })
  | (Press & { readonly kind: 'drag'; readonly nodeKey: string; readonly start: Point })

type SvgPointerEvent = TargetedPointerEvent<SVGSVGElement>
type Latest = RefObject<CanvasActions>
type Current = RefObject<Gesture>

const IDLE: Gesture = { kind: 'idle' }
const PRIMARY_BUTTON = 0
const CLICK_TOLERANCE = 3
const WHEEL_ZOOM_SENSITIVITY = 0.0015
const LINE_HEIGHT_PX = 16

export function useCanvasGestures(actions: CanvasActions) {
  // Stable handlers that always read the latest props, so the canvas never rebinds mid-gesture.
  const latest = useRef(actions)
  latest.current = actions
  return useMemo(() => createCanvasHandlers(latest), [])
}

/** The canvas's event handlers, reading the actions to call from `latest` at each event. */
export function createCanvasHandlers(latest: Latest) {
  return {
    ...pointerHandlers(latest),
    onPointerLeave: () => latest.current.onHover(null),
    onDoubleClick: (event: TargetedMouseEvent<SVGSVGElement>) => openAt(event, latest.current),
    onWheel: (event: TargetedWheelEvent<SVGSVGElement>) => wheel(event, latest.current),
    onKeyDown: (event: TargetedKeyboardEvent<SVGSVGElement>) => keyDown(event, latest.current)
  }
}

function pointerHandlers(latest: Latest) {
  const gesture: Current = { current: IDLE }
  const finishWith = (how: 'release' | 'cancel') => (event: SvgPointerEvent) => {
    gesture.current = finish(gesture.current, event.pointerId, how, latest.current)
  }
  return {
    onPointerDown: (event: SvgPointerEvent) => {
      gesture.current = begin(gesture.current, event, latest.current)
    },
    onPointerMove: (event: SvgPointerEvent) => {
      gesture.current = advance(gesture.current, event, latest.current)
    },
    onPointerUp: finishWith('release'),
    onPointerCancel: finishWith('cancel'),
    onLostPointerCapture: finishWith('cancel')
  }
}

function begin(current: Gesture, event: SvgPointerEvent, actions: CanvasActions): Gesture {
  if (current.kind !== 'idle' || event.button !== PRIMARY_BUTTON) return current
  capturePointer(event.currentTarget, event.pointerId)
  const press = {
    pointerId: event.pointerId,
    origin: { x: event.clientX, y: event.clientY },
    moved: false
  }
  const nodeKey = nodeKeyAt(event.target)
  const start = nodeKey === null ? null : actions.positionOf(nodeKey)
  return nodeKey !== null && start
    ? { ...press, kind: 'drag', nodeKey, start }
    : { ...press, kind: 'pan', start: actions.viewport }
}

function advance(current: Gesture, event: SvgPointerEvent, actions: CanvasActions): Gesture {
  if (current.kind === 'idle') {
    actions.onHover(hitTargetAt(event.target))
    return current
  }
  if (event.pointerId !== current.pointerId) return current
  if (event.buttons === 0) return finish(current, current.pointerId, 'cancel', actions)
  const dx = event.clientX - current.origin.x
  const dy = event.clientY - current.origin.y
  if (!current.moved && Math.hypot(dx, dy) < CLICK_TOLERANCE) return current
  if (current.kind === 'pan') actions.onViewportChange(panBy(current.start, dx, dy))
  else {
    const zoom = actions.viewport.zoom
    actions.onNodeMove(current.nodeKey, {
      x: current.start.x + dx / zoom,
      y: current.start.y + dy / zoom
    })
  }
  return { ...current, moved: true }
}

function finish(
  current: Gesture,
  pointerId: number,
  how: 'release' | 'cancel',
  actions: CanvasActions
): Gesture {
  if (current.kind === 'idle' || pointerId !== current.pointerId) return current
  if (current.kind === 'drag' && current.moved) actions.onNodeMoveEnd()
  if (how === 'release' && !current.moved) {
    actions.onSelect(current.kind === 'drag' ? current.nodeKey : null)
  }
  return IDLE
}

// Pointer capture sends the double click to the canvas itself, so the target says nothing about
// what sits under the pointer.
function openAt(event: TargetedMouseEvent<SVGSVGElement>, actions: CanvasActions): void {
  const nodeKey = nodeKeyAt(document.elementFromPoint(event.clientX, event.clientY))
  if (nodeKey !== null) actions.onOpen(nodeKey)
}

/** Pinch and Ctrl or Cmd with the wheel zoom around the pointer; plain wheel and trackpad pan. */
function wheel(event: TargetedWheelEvent<SVGSVGElement>, actions: CanvasActions): void {
  event.preventDefault()
  const scale = deltaScale(event)
  if (event.ctrlKey || event.metaKey) {
    const box = event.currentTarget.getBoundingClientRect()
    const focus = { x: event.clientX - box.left, y: event.clientY - box.top }
    const factor = Math.exp(-event.deltaY * scale * WHEEL_ZOOM_SENSITIVITY)
    actions.onViewportChange((current) => zoomAt(current, focus, factor))
    return
  }
  const dx = -event.deltaX * scale
  const dy = -event.deltaY * scale
  actions.onViewportChange((current) => panBy(current, dx, dy))
}

// Wheel deltas arrive in pixels, lines (Firefox mouse wheels) or pages; work in pixels.
function deltaScale(event: TargetedWheelEvent<SVGSVGElement>): number {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return LINE_HEIGHT_PX
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.currentTarget.clientHeight
  return 1
}

function keyDown(event: TargetedKeyboardEvent<SVGSVGElement>, actions: CanvasActions): void {
  if (event.ctrlKey || event.metaKey || event.altKey) return
  const command = KEY_COMMANDS[event.key]
  if (!command) return
  event.preventDefault()
  command(actions)
}

type KeyCommand = (actions: CanvasActions) => void

const zoomIn: KeyCommand = (actions) => actions.onZoomBy(ZOOM_STEP)
const zoomOut: KeyCommand = (actions) => actions.onZoomBy(1 / ZOOM_STEP)
const next: KeyCommand = (actions) => actions.onStep(1)
const previous: KeyCommand = (actions) => actions.onStep(-1)

/** The key that fits the diagram to the view, which the toolbar's fit button names too. */
export const FIT_KEY = '0'

type KeyGroup = {
  readonly help: string
  readonly commands: Readonly<Record<string, KeyCommand>>
}

const KEY_GROUPS: readonly KeyGroup[] = [
  {
    help: 'Arrow keys move between tables',
    commands: { ArrowRight: next, ArrowDown: next, ArrowLeft: previous, ArrowUp: previous }
  },
  {
    help: 'Enter opens the selected table in the code',
    commands: { Enter: (actions) => actions.onOpenSelected() }
  },
  { help: 'plus and minus zoom', commands: { '+': zoomIn, '=': zoomIn, '-': zoomOut } },
  { help: `${FIT_KEY} fits the diagram`, commands: { [FIT_KEY]: (actions) => actions.onFit() } },
  {
    help: 'Escape clears the selection',
    commands: { Escape: (actions) => actions.onSelect(null) }
  }
]

const KEY_COMMANDS: Readonly<Record<string, KeyCommand>> = Object.fromEntries(
  KEY_GROUPS.flatMap((group) => Object.entries(group.commands))
)

/** What the canvas keys do, in words, for its accessible description. */
export const KEYBOARD_HELP = `${KEY_GROUPS.map((group) => group.help).join(', ')}.`
