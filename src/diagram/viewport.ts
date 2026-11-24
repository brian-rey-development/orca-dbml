import { clamp, type Point, type Rect, type Size } from '../layout/geometry'

export type Viewport = {
  readonly x: number
  readonly y: number
  readonly zoom: number
}

export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 3
export const ZOOM_STEP = 1.2
const FIT_PADDING = 48
const MAX_FIT_ZOOM = 1

/** A new viewport, or a change to apply to the latest one (events can outrun renders). */
export type ViewportUpdate = Viewport | ((current: Viewport) => Viewport)

export const IDENTITY_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 }

export function zoomAt(viewport: Viewport, focus: Point, factor: number): Viewport {
  const zoom = clamp(viewport.zoom * factor, MIN_ZOOM, MAX_ZOOM)
  const scale = zoom / viewport.zoom
  return {
    zoom,
    x: focus.x - (focus.x - viewport.x) * scale,
    y: focus.y - (focus.y - viewport.y) * scale
  }
}

export function panBy(viewport: Viewport, dx: number, dy: number): Viewport {
  return { ...viewport, x: viewport.x + dx, y: viewport.y + dy }
}

export function fitBounds(bounds: Rect, screen: Size): Viewport {
  const usableWidth = Math.max(1, screen.width - FIT_PADDING * 2)
  const usableHeight = Math.max(1, screen.height - FIT_PADDING * 2)
  const zoom = clamp(
    Math.min(usableWidth / Math.max(1, bounds.width), usableHeight / Math.max(1, bounds.height)),
    MIN_ZOOM,
    MAX_FIT_ZOOM
  )
  return {
    zoom,
    x: (screen.width - bounds.width * zoom) / 2 - bounds.x * zoom,
    y: (screen.height - bounds.height * zoom) / 2 - bounds.y * zoom
  }
}

export function centerOn(viewport: Viewport, target: Rect, screen: Size): Viewport {
  return {
    zoom: viewport.zoom,
    x: screen.width / 2 - (target.x + target.width / 2) * viewport.zoom,
    y: screen.height / 2 - (target.y + target.height / 2) * viewport.zoom
  }
}

export function visibleWorld(viewport: Viewport, screen: Size): Rect {
  const topLeft = toWorld(viewport, { x: 0, y: 0 })
  return { ...topLeft, width: screen.width / viewport.zoom, height: screen.height / viewport.zoom }
}

export function toWorld(viewport: Viewport, screenPoint: Point): Point {
  return {
    x: (screenPoint.x - viewport.x) / viewport.zoom,
    y: (screenPoint.y - viewport.y) / viewport.zoom
  }
}
