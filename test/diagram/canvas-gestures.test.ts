import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import {
  createCanvasHandlers,
  type CanvasActions
} from '../../src/diagram/components/use-canvas-gestures'

/** The part of a DOM element hit-testing reads: the node key on it or on an ancestor. */
class FakeElement {
  constructor(private readonly nodeKey: string | null) {}

  closest(selector: string): FakeElement | null {
    return this.nodeKey !== null && selector === '[data-node-key]' ? this : null
  }

  getAttribute(): string | null {
    return this.nodeKey
  }

  setPointerCapture(): void {}
}

const CARD = 'table:users'
const CARD_POSITION = { x: 100, y: 50 }
const POINTER = 1

function actions(zoom = 1) {
  return {
    viewport: { x: 0, y: 0, zoom },
    positionOf: (key: string) => (key === CARD ? CARD_POSITION : null),
    onViewportChange: vi.fn(),
    onZoomBy: vi.fn(),
    onNodeMove: vi.fn(),
    onNodeMoveEnd: vi.fn(),
    onSelect: vi.fn(),
    onOpen: vi.fn(),
    onOpenSelected: vi.fn(),
    onStep: vi.fn(),
    onHover: vi.fn(),
    onFit: vi.fn()
  } satisfies CanvasActions
}

/** A pointer event with only the fields the handlers read. */
function pointer(x: number, y: number, on: FakeElement, buttons = 1): PointerEvent {
  const canvas = new FakeElement(null)
  const event = {
    button: 0,
    buttons,
    pointerId: POINTER,
    clientX: x,
    clientY: y,
    target: on,
    currentTarget: canvas
  }
  return event as unknown as PointerEvent
}

type Handlers = ReturnType<typeof createCanvasHandlers>
type PointerEvent = Parameters<Handlers['onPointerDown']>[0]

function press(handlers: Handlers, path: [number, number][], on: FakeElement, end = 'up') {
  const [start = [0, 0], ...moves] = path
  handlers.onPointerDown(pointer(...start, on))
  moves.forEach(([x, y]) => handlers.onPointerMove(pointer(x, y, on)))
  const last = path.at(-1) ?? start
  const release = pointer(...last, on, 0)
  if (end === 'up') handlers.onPointerUp(release)
  else handlers.onPointerCancel(release)
}

beforeEach(() => {
  vi.stubGlobal('Element', FakeElement)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('canvas gestures', () => {
  it('opens the card under the pointer on a double click, though capture targets the canvas', () => {
    const card = new FakeElement(CARD)
    vi.stubGlobal('document', {
      elementFromPoint: (x: number, y: number) => (x === 5 && y === 7 ? card : null)
    })
    const canvasActions = actions()
    const handlers = createCanvasHandlers({ current: canvasActions })
    const onCanvas = pointer(5, 7, new FakeElement(null))
    handlers.onDoubleClick(onCanvas as unknown as Parameters<Handlers['onDoubleClick']>[0])
    expect(canvasActions.onOpen).toHaveBeenCalledWith(CARD)
  })

  it('selects a card on a click, even with a little jitter, without moving it', () => {
    const calls = actions()
    press(
      createCanvasHandlers({ current: calls }),
      [
        [10, 10],
        [11, 11]
      ],
      new FakeElement(CARD)
    )
    expect(calls.onSelect).toHaveBeenCalledWith(CARD)
    expect(calls.onNodeMove).not.toHaveBeenCalled()
    expect(calls.onNodeMoveEnd).not.toHaveBeenCalled()
  })

  it('drags a card by the pointer distance in diagram units, then ends the move', () => {
    const calls = actions(2)
    press(
      createCanvasHandlers({ current: calls }),
      [
        [10, 10],
        [50, 30]
      ],
      new FakeElement(CARD)
    )
    expect(calls.onNodeMove).toHaveBeenLastCalledWith(CARD, { x: 120, y: 60 })
    expect(calls.onNodeMoveEnd).toHaveBeenCalledOnce()
    expect(calls.onSelect).not.toHaveBeenCalled()
  })

  it('pans on the background, and a click there clears the selection', () => {
    const calls = actions()
    const background = new FakeElement(null)
    press(
      createCanvasHandlers({ current: calls }),
      [
        [10, 10],
        [40, 10]
      ],
      background
    )
    expect(calls.onViewportChange).toHaveBeenLastCalledWith({ x: 30, y: 0, zoom: 1 })
    expect(calls.onSelect).not.toHaveBeenCalled()
    press(createCanvasHandlers({ current: calls }), [[10, 10]], background)
    expect(calls.onSelect).toHaveBeenCalledWith(null)
  })

  it('selects nothing when the browser cancels the press', () => {
    const calls = actions()
    press(createCanvasHandlers({ current: calls }), [[10, 10]], new FakeElement(CARD), 'cancel')
    expect(calls.onSelect).not.toHaveBeenCalled()
  })

  it('ends a press whose button was released outside the canvas', () => {
    const calls = actions()
    const handlers = createCanvasHandlers({ current: calls })
    const card = new FakeElement(CARD)
    handlers.onPointerDown(pointer(10, 10, card))
    handlers.onPointerMove(pointer(60, 60, card, 0))
    handlers.onPointerMove(pointer(90, 90, card, 1))
    expect(calls.onNodeMove).not.toHaveBeenCalled()
    expect(calls.onSelect).not.toHaveBeenCalled()
  })
})

/** A key press with only the fields the handler reads; `modifier` names one held key. */
function keyPress(key: string, modifier?: 'ctrlKey' | 'metaKey' | 'altKey') {
  const event = { key, preventDefault: vi.fn(), ...(modifier ? { [modifier]: true } : {}) }
  return event as unknown as Parameters<Handlers['onKeyDown']>[0] & { preventDefault: Mock }
}

describe('canvas keys', () => {
  it('zooms, fits and steps through tables, and keeps the key from the page', () => {
    const calls = actions()
    const handlers = createCanvasHandlers({ current: calls })
    const plus = keyPress('+')
    handlers.onKeyDown(plus)
    handlers.onKeyDown(keyPress('0'))
    handlers.onKeyDown(keyPress('ArrowLeft'))
    expect(calls.onZoomBy).toHaveBeenCalledWith(1.2)
    expect(calls.onFit).toHaveBeenCalledOnce()
    expect(calls.onStep).toHaveBeenCalledWith(-1)
    expect(plus.preventDefault).toHaveBeenCalled()
  })

  it('leaves shortcuts with Ctrl, Cmd or Alt to Orca', () => {
    const calls = actions()
    const handlers = createCanvasHandlers({ current: calls })
    const shortcuts = [
      keyPress('+', 'ctrlKey'),
      keyPress('0', 'metaKey'),
      keyPress('ArrowUp', 'altKey')
    ]
    shortcuts.forEach((event) => handlers.onKeyDown(event))
    expect(calls.onZoomBy).not.toHaveBeenCalled()
    expect(calls.onFit).not.toHaveBeenCalled()
    expect(calls.onStep).not.toHaveBeenCalled()
    shortcuts.forEach((event) => expect(event.preventDefault).not.toHaveBeenCalled())
  })

  it('ignores keys it has no command for', () => {
    const event = keyPress('q')
    createCanvasHandlers({ current: actions() }).onKeyDown(event)
    expect(event.preventDefault).not.toHaveBeenCalled()
  })
})
