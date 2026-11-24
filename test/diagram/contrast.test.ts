import { describe, expect, it } from 'vitest'
import { readableTextOn } from '../../src/diagram/contrast'

const WHITE = '#ffffff'
const NEAR_BLACK = '#1f2328'

describe('readableTextOn', () => {
  // Expected picks come from the WCAG 2 contrast ratios of each pair, worked out separately.
  it.each([
    ['#fdf3c4', NEAR_BLACK],
    ['#ef4444', NEAR_BLACK],
    ['#3b82f6', NEAR_BLACK],
    ['#0f766e', WHITE],
    ['#7c3aed', WHITE],
    ['#2563eb', WHITE],
    ['#345', WHITE]
  ])('picks the text with more contrast on %s', (header, text) => {
    expect(readableTextOn(header)).toBe(text)
  })

  it('leaves colors it cannot read to the theme', () => {
    expect(readableTextOn('none')).toBeNull()
    expect(readableTextOn('rgb(0, 0, 0)')).toBeNull()
  })
})
