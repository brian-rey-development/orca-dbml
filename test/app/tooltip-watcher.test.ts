import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { placeTooltip, TooltipWatcher, type Tooltip } from '../../src/app/tooltip-watcher'

/** The part of an element the watcher reads: its tooltip, focus style and box. */
class FakeElement {
  constructor(
    private readonly tooltip: string | null,
    private readonly keyboardFocus = false
  ) {}

  closest(): FakeElement | null {
    return this.tooltip === null ? null : this
  }

  getAttribute(): string | null {
    return this.tooltip
  }

  matches(): boolean {
    return this.keyboardFocus
  }

  getBoundingClientRect() {
    return { x: 100, y: 10, width: 30, height: 20, top: 10, bottom: 30 }
  }
}

class FakePointerEvent {
  constructor(
    readonly type: string,
    readonly target: FakeElement | null,
    readonly clientX = 0,
    readonly clientY = 0,
    readonly buttons = 0,
    readonly relatedTarget: FakeElement | null = target
  ) {}
}

class FakeFocusEvent {
  constructor(
    readonly type: string,
    readonly target: FakeElement
  ) {}
}

class FakeKeyboardEvent {
  constructor(readonly key: string) {}
}

const DELAY_MS = 500
const BUTTON = new FakeElement('Zoom in')

function watch(): { shown: (Tooltip | null)[]; send: (event: object) => void } {
  const shown: (Tooltip | null)[] = []
  const watcher = new TooltipWatcher((tooltip) => shown.push(tooltip))
  return { shown, send: (event) => watcher.handleEvent(event as Event) }
}

function lastShown(shown: readonly (Tooltip | null)[]): Tooltip | null {
  return shown.at(-1) ?? null
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('Element', FakeElement)
  vi.stubGlobal('PointerEvent', FakePointerEvent)
  vi.stubGlobal('FocusEvent', FakeFocusEvent)
  vi.stubGlobal('KeyboardEvent', FakeKeyboardEvent)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('TooltipWatcher', () => {
  it('shows the tooltip below the pointer once it rests on an element', () => {
    const { shown, send } = watch()
    send(new FakePointerEvent('pointerover', BUTTON, 40, 50))
    send(new FakePointerEvent('pointermove', BUTTON, 42, 51))
    expect(lastShown(shown)).toBeNull()
    vi.advanceTimersByTime(DELAY_MS)
    expect(lastShown(shown)?.text).toBe('Zoom in')
    expect(lastShown(shown)?.anchor.x).toBe(42)
  })

  it('shows nothing when the person presses before the delay ends', () => {
    const { shown, send } = watch()
    send(new FakePointerEvent('pointerover', BUTTON))
    send(new FakePointerEvent('pointerdown', BUTTON))
    vi.advanceTimersByTime(DELAY_MS)
    expect(lastShown(shown)).toBeNull()
  })

  it('hides when the pointer moves to something without a tooltip or leaves the frame', () => {
    const { shown, send } = watch()
    send(new FakePointerEvent('pointerover', BUTTON))
    vi.advanceTimersByTime(DELAY_MS)
    send(new FakePointerEvent('pointerover', new FakeElement(null)))
    expect(lastShown(shown)).toBeNull()
    send(new FakePointerEvent('pointerover', BUTTON))
    vi.advanceTimersByTime(DELAY_MS)
    send(new FakePointerEvent('pointerout', BUTTON, 0, 0, 0, null))
    expect(lastShown(shown)).toBeNull()
  })

  it('shows on keyboard focus but not on the focus a click gives', () => {
    const clicked = watch()
    clicked.send(new FakeFocusEvent('focusin', BUTTON))
    vi.advanceTimersByTime(DELAY_MS)
    expect(lastShown(clicked.shown)).toBeNull()
    const tabbed = watch()
    tabbed.send(new FakeFocusEvent('focusin', new FakeElement('Fit diagram', true)))
    vi.advanceTimersByTime(DELAY_MS)
    expect(lastShown(tabbed.shown)?.anchor).toEqual({ x: 115, below: 36, above: 4 })
  })

  it('hides on Escape and on scrolling', () => {
    const { shown, send } = watch()
    send(new FakePointerEvent('pointerover', BUTTON))
    vi.advanceTimersByTime(DELAY_MS)
    send(new FakeKeyboardEvent('Escape'))
    expect(lastShown(shown)).toBeNull()
    send(new FakePointerEvent('pointerover', new FakeElement('Zoom out')))
    vi.advanceTimersByTime(DELAY_MS)
    send({ type: 'wheel' })
    expect(lastShown(shown)).toBeNull()
  })
})

describe('placeTooltip', () => {
  const frame = { width: 400, height: 300 }
  const size = { width: 100, height: 30 }

  it('centres the tooltip below its anchor', () => {
    expect(placeTooltip({ x: 200, below: 50, above: 30 }, size, frame)).toEqual({ x: 150, y: 50 })
  })

  it('keeps the tooltip inside the frame at the edges', () => {
    expect(placeTooltip({ x: 395, below: 50, above: 30 }, size, frame).x).toBe(292)
    expect(placeTooltip({ x: 5, below: 50, above: 30 }, size, frame).x).toBe(8)
  })

  it('goes above its anchor when there is no room below', () => {
    expect(placeTooltip({ x: 200, below: 280, above: 260 }, size, frame).y).toBe(230)
  })
})
