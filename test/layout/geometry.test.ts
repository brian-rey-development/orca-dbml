import { describe, expect, it } from 'vitest'
import { boundsOf, inflate, intersects } from '../../src/layout/geometry'

const BOX = { x: 0, y: 0, width: 100, height: 50 }

describe('boundsOf', () => {
  it('covers every rectangle, even ones at negative coordinates', () => {
    const far = { x: -40, y: 200, width: 10, height: 10 }
    expect(boundsOf([BOX, far])).toEqual({ x: -40, y: 0, width: 140, height: 210 })
  })

  it('has no bounds for nothing', () => {
    expect(boundsOf([])).toBeNull()
  })
})

describe('inflate', () => {
  it('grows a rectangle evenly on every side', () => {
    expect(inflate(BOX, 8)).toEqual({ x: -8, y: -8, width: 116, height: 66 })
  })
})

describe('intersects', () => {
  it('detects overlap but not rectangles that only touch', () => {
    expect(intersects(BOX, { ...BOX, x: 99 })).toBe(true)
    expect(intersects(BOX, { ...BOX, x: 100 })).toBe(false)
    expect(intersects(BOX, { ...BOX, y: 50 })).toBe(false)
  })

  it('detects a rectangle inside another', () => {
    expect(intersects(BOX, { x: 10, y: 10, width: 5, height: 5 })).toBe(true)
  })
})
