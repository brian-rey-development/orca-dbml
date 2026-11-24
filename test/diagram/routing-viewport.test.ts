import { describe, expect, it } from 'vitest'
import { markerShape } from '../../src/diagram/markers'
import { chooseSides, route } from '../../src/diagram/routing'
import {
  MAX_ZOOM,
  MIN_ZOOM,
  centerOn,
  fitBounds,
  toWorld,
  visibleWorld,
  zoomAt
} from '../../src/diagram/viewport'

const LEFT = { x: 0, y: 0, width: 100, height: 100 }
const RIGHT = { x: 300, y: 0, width: 100, height: 100 }

function pointsOf(path: string): { x: number; y: number }[] {
  const numbers = path.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? []
  return numbers.flatMap((value, index) =>
    index % 2 === 0 ? [{ x: value, y: numbers[index + 1] ?? 0 }] : []
  )
}

describe('routing', () => {
  it('connects facing sides of tables that sit apart', () => {
    expect(chooseSides(LEFT, RIGHT)).toEqual(['right', 'left'])
    expect(chooseSides(RIGHT, LEFT)).toEqual(['left', 'right'])
  })

  it('uses one shared side for stacked tables', () => {
    const [a, b] = chooseSides(LEFT, { ...LEFT, y: 200 })
    expect(a).toBe(b)
  })

  it('runs from the anchored row of one table to the other, inside its bounds', () => {
    const result = route({ nodeId: 'a', rect: LEFT, y: 40 }, { nodeId: 'b', rect: RIGHT, y: 70 })
    expect(result.start.point).toEqual({ x: 100, y: 40 })
    expect(result.end.point).toEqual({ x: 300, y: 70 })
    const { bounds } = result
    for (const point of pointsOf(result.path)) {
      expect(point.x).toBeGreaterThanOrEqual(bounds.x)
      expect(point.x).toBeLessThanOrEqual(bounds.x + bounds.width)
      expect(point.y).toBeGreaterThanOrEqual(bounds.y)
      expect(point.y).toBeLessThanOrEqual(bounds.y + bounds.height)
    }
  })

  it('loops a self reference out of the right side', () => {
    const result = route({ nodeId: 'a', rect: LEFT, y: 40 }, { nodeId: 'a', rect: LEFT, y: 70 })
    expect([result.start.side, result.end.side]).toEqual(['right', 'right'])
  })

  it('keeps a self reference an open loop when both ends sit on the same row', () => {
    const result = route({ nodeId: 'a', rect: LEFT, y: 18 }, { nodeId: 'a', rect: LEFT, y: 18 })
    expect(result.start.point.y).toBeLessThan(result.end.point.y)
    expect(result.bounds.height).toBeGreaterThan(0)
  })
})

describe('markerShape', () => {
  const end = { point: { x: 100, y: 50 }, side: 'right' as const }

  it('fans a many end out across the edge it touches', () => {
    const atEdge = pointsOf(markerShape(end, { many: true, optional: false }).lines).filter(
      (point) => point.x === end.point.x
    )
    expect(new Set(atEdge.map((point) => point.y)).size).toBe(3)
  })

  it('crosses a one end with a bar off the edge', () => {
    const bar = pointsOf(markerShape(end, { many: false, optional: false }).lines)
    expect(new Set(bar.map((point) => point.x)).size).toBe(1)
    expect(bar[0]?.x).toBeGreaterThan(end.point.x)
  })

  it('mirrors its shape for an end on the left side of a table', () => {
    const left = { point: { x: 100, y: 50 }, side: 'left' as const }
    expect(markerShape(left, { many: false, optional: true }).circle?.cx ?? 100).toBeLessThan(100)
    const bar = pointsOf(markerShape(left, { many: false, optional: false }).lines)
    expect(bar[0]?.x).toBeLessThan(left.point.x)
  })

  it('adds a ring outside the table for optional ends', () => {
    expect(markerShape(end, { many: false, optional: true }).circle?.cx ?? 0).toBeGreaterThan(100)
    expect(markerShape(end, { many: false, optional: false }).circle).toBeNull()
  })
})

describe('viewport', () => {
  it('keeps the focus point fixed while zooming', () => {
    const viewport = { x: 10, y: 20, zoom: 1 }
    const focus = { x: 200, y: 150 }
    const after = toWorld(zoomAt(viewport, focus, 2), focus)
    const before = toWorld(viewport, focus)
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)
  })

  it('fits bounds inside the screen without zooming past 100%', () => {
    const viewport = fitBounds({ x: 0, y: 0, width: 100, height: 100 }, { width: 800, height: 600 })
    expect(viewport.zoom).toBe(1)
    expect(viewport.x).toBe(350)
  })

  it('never zooms past its limits', () => {
    const viewport = { x: 0, y: 0, zoom: 1 }
    expect(zoomAt(viewport, { x: 0, y: 0 }, 1000).zoom).toBe(MAX_ZOOM)
    expect(zoomAt(viewport, { x: 0, y: 0 }, 0.0001).zoom).toBe(MIN_ZOOM)
  })

  it('shrinks a diagram larger than the screen until it fits', () => {
    const screen = { width: 800, height: 600 }
    const bounds = { x: -500, y: 0, width: 4000, height: 1000 }
    const viewport = fitBounds(bounds, screen)
    const shown = visibleWorld(viewport, screen)
    expect(viewport.zoom).toBeLessThan(1)
    expect(shown.x).toBeLessThanOrEqual(bounds.x)
    expect(shown.x + shown.width).toBeGreaterThanOrEqual(bounds.x + bounds.width)
  })

  it('centers a target on screen without changing the zoom', () => {
    const screen = { width: 800, height: 600 }
    const viewport = centerOn(
      { x: 0, y: 0, zoom: 2 },
      { x: 100, y: 100, width: 50, height: 50 },
      screen
    )
    expect(viewport.zoom).toBe(2)
    expect(toWorld(viewport, { x: 400, y: 300 })).toEqual({ x: 125, y: 125 })
  })

  it('reports the part of the world on screen', () => {
    expect(visibleWorld({ x: -100, y: 0, zoom: 2 }, { width: 400, height: 200 })).toEqual({
      x: 50,
      y: 0,
      width: 200,
      height: 100
    })
  })
})
