import { describe, expect, it } from 'vitest'
import { MIN_PNG_SCALE, pngScale } from '../../src/export/diagram-export'

const CANVAS_SIDE_LIMIT = 16384
const CANVAS_AREA_LIMIT = 268_435_456

describe('pngScale', () => {
  it('draws an ordinary diagram at twice its size, for sharp text', () => {
    expect(pngScale({ width: 1200, height: 800 })).toBe(2)
  })

  it('shrinks a long diagram to the widest canvas a browser allows', () => {
    const scale = pngScale({ width: 20000, height: 500 })
    expect(20000 * scale).toBeLessThanOrEqual(CANVAS_SIDE_LIMIT)
    expect(scale).toBeLessThan(1)
  })

  it('shrinks a large square diagram to the biggest canvas area a browser allows', () => {
    const scale = pngScale({ width: 15000, height: 15000 })
    expect(15000 * scale * 15000 * scale).toBeLessThanOrEqual(CANVAS_AREA_LIMIT)
  })

  it('reports a diagram too large to draw legibly below the minimum scale', () => {
    expect(pngScale({ width: 200000, height: 1000 })).toBeLessThan(MIN_PNG_SCALE)
  })
})
