export type Point = {
  readonly x: number
  readonly y: number
}

export type Size = {
  readonly width: number
  readonly height: number
}

export type Rect = Point & Size

export function rectAt(point: Point, size: Size): Rect {
  return { x: point.x, y: point.y, width: size.width, height: size.height }
}

export function boundsOf(rects: readonly Rect[]): Rect | null {
  const [first, ...rest] = rects
  if (!first) return null
  const edges = rest.reduce(
    (acc, rect) => ({
      left: Math.min(acc.left, rect.x),
      top: Math.min(acc.top, rect.y),
      right: Math.max(acc.right, rect.x + rect.width),
      bottom: Math.max(acc.bottom, rect.y + rect.height)
    }),
    { left: first.x, top: first.y, right: first.x + first.width, bottom: first.y + first.height }
  )
  return {
    x: edges.left,
    y: edges.top,
    width: edges.right - edges.left,
    height: edges.bottom - edges.top
  }
}

export function inflate(rect: Rect, by: number): Rect {
  return {
    x: rect.x - by,
    y: rect.y - by,
    width: rect.width + by * 2,
    height: rect.height + by * 2
  }
}

export function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function isFinitePoint(value: unknown): value is Point {
  if (typeof value !== 'object' || value === null) return false
  const { x, y } = value as Partial<Record<keyof Point, unknown>>
  return Number.isFinite(x) && Number.isFinite(y)
}

export function sameRect(a: Rect, b: Rect): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
}
