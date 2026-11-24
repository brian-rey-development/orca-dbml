import { clamp, type Point, type Rect } from '../layout/geometry'

export type Side = 'left' | 'right'

export type Anchor = {
  readonly nodeId: string
  readonly rect: Rect
  readonly y: number
}

export type RouteEnd = {
  readonly point: Point
  readonly side: Side
}

export type Route = {
  readonly path: string
  readonly start: RouteEnd
  readonly end: RouteEnd
  /** A box the curve stays inside: a cubic never leaves the hull of its control points. */
  readonly bounds: Rect
}

const MIN_HORIZONTAL_GAP = 48
const MIN_CURVE = 48
const MAX_CURVE = 180
const SELF_LOOP_REACH = 56
const SELF_LOOP_SPREAD = 8
// Path coordinates keep one decimal place.
const DECIMAL_STEPS = 10

export function direction(side: Side): number {
  return side === 'right' ? 1 : -1
}

export function route(from: Anchor, to: Anchor): Route {
  if (from.nodeId === to.nodeId) return selfLoop(from, to)
  const [fromSide, toSide] = chooseSides(from.rect, to.rect)
  const start = { point: edgePoint(from, fromSide), side: fromSide }
  const end = { point: edgePoint(to, toSide), side: toSide }
  const reach = clamp(Math.abs(end.point.x - start.point.x) / 2, MIN_CURVE, MAX_CURVE)
  return cubic(start, end, reach)
}

export function chooseSides(a: Rect, b: Rect): readonly [Side, Side] {
  if (b.x >= a.x + a.width + MIN_HORIZONTAL_GAP) return ['right', 'left']
  if (a.x >= b.x + b.width + MIN_HORIZONTAL_GAP) return ['left', 'right']
  const leftRoom = Math.min(a.x, b.x)
  const rightRoom = Math.max(a.x + a.width, b.x + b.width)
  const center = (a.x + a.width / 2 + b.x + b.width / 2) / 2
  return center - leftRoom <= rightRoom - center ? ['left', 'left'] : ['right', 'right']
}

// Ends on the same row, such as a table's header when its columns are hidden, would draw the loop
// flat; spreading them apart keeps it a visible loop.
function selfLoop(from: Anchor, to: Anchor): Route {
  const spread = from.y === to.y ? SELF_LOOP_SPREAD : 0
  const start = {
    point: edgePoint({ ...from, y: from.y - spread }, 'right'),
    side: 'right' as const
  }
  const end = { point: edgePoint({ ...to, y: to.y + spread }, 'right'), side: 'right' as const }
  return cubic(start, end, SELF_LOOP_REACH)
}

function edgePoint({ rect, y }: Anchor, side: Side): Point {
  return { x: side === 'right' ? rect.x + rect.width : rect.x, y }
}

function cubic(start: RouteEnd, end: RouteEnd, reach: number): Route {
  const c1 = { x: start.point.x + direction(start.side) * reach, y: start.point.y }
  const c2 = { x: end.point.x + direction(end.side) * reach, y: end.point.y }
  return {
    path: `M ${fmt(start.point)} C ${fmt(c1)} ${fmt(c2)} ${fmt(end.point)}`,
    start,
    end,
    bounds: hullBounds([start.point, c1, c2, end.point])
  }
}

function hullBounds(points: readonly Point[]): Rect {
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }
}

function fmt({ x, y }: Point): string {
  return `${round(x)} ${round(y)}`
}

function round(value: number): number {
  return Math.round(value * DECIMAL_STEPS) / DECIMAL_STEPS
}
