import type { Point, Size } from '../layout/geometry'
import { tooltipOwner, tooltipText } from '../tooltip'

/** Where a tooltip may go: below its anchor when it fits, otherwise above. */
export type TooltipAnchor = { readonly x: number; readonly below: number; readonly above: number }

export type Tooltip = { readonly text: string; readonly anchor: TooltipAnchor }

/** The events the watcher needs, listened to in the capture phase so no handler can hide them. */
export const WATCHED_EVENTS = [
  'pointerover',
  'pointermove',
  'pointerout',
  'pointerdown',
  'focusin',
  'focusout',
  'keydown',
  'wheel'
] as const

const SHOW_DELAY_MS = 500
// Below the pointer, clear of the cursor image; above it, just clear of the hot spot.
const BELOW_POINTER = 18
const ABOVE_POINTER = 6
const BESIDE_ELEMENT = 6
const EDGE_MARGIN = 8

/**
 * Shows an element's tooltip once the pointer rests on it or it takes keyboard focus, and hides
 * it as soon as the person presses, scrolls, types Escape or moves away.
 */
export class TooltipWatcher implements EventListenerObject {
  private owner: Element | null = null
  private timer: ReturnType<typeof setTimeout> | undefined
  private pointer: Point = { x: 0, y: 0 }

  constructor(private readonly show: (tooltip: Tooltip | null) => void) {}

  handleEvent(event: Event): void {
    if (event instanceof PointerEvent) this.pointerEvent(event)
    else if (event instanceof FocusEvent) this.focusEvent(event)
    else if (event instanceof KeyboardEvent) this.keyEvent(event)
    else this.hide()
  }

  /** Stops a tooltip that is still waiting to show, without reporting anything. */
  dispose(): void {
    clearTimeout(this.timer)
  }

  private pointerEvent(event: PointerEvent): void {
    this.pointer = { x: event.clientX, y: event.clientY }
    if (event.type === 'pointerover') this.rest(event)
    else if (event.type === 'pointerdown') this.hide()
    else if (event.type === 'pointerout' && event.relatedTarget === null) this.hide()
  }

  private rest(event: PointerEvent): void {
    const owner = tooltipOwner(event.target)
    if (owner === this.owner) return
    this.hide()
    if (owner && event.buttons === 0) this.schedule(owner, () => pointerAnchor(this.pointer))
  }

  // Only keyboard focus shows a tooltip; a click also focuses the button, and the person who just
  // clicked has seen what it does.
  private focusEvent(event: FocusEvent): void {
    this.hide()
    const owner = event.type === 'focusin' ? tooltipOwner(event.target) : null
    if (owner?.matches(':focus-visible')) this.schedule(owner, () => elementAnchor(owner))
  }

  private keyEvent(event: KeyboardEvent): void {
    if (event.key === 'Escape') this.hide()
  }

  private hide(): void {
    clearTimeout(this.timer)
    this.owner = null
    this.show(null)
  }

  private schedule(owner: Element, anchor: () => TooltipAnchor): void {
    this.owner = owner
    this.timer = setTimeout(
      () => this.show({ text: tooltipText(owner), anchor: anchor() }),
      SHOW_DELAY_MS
    )
  }
}

function pointerAnchor({ x, y }: Point): TooltipAnchor {
  return { x, below: y + BELOW_POINTER, above: y - ABOVE_POINTER }
}

function elementAnchor(owner: Element): TooltipAnchor {
  const box = owner.getBoundingClientRect()
  return {
    x: box.x + box.width / 2,
    below: box.bottom + BESIDE_ELEMENT,
    above: box.top - BESIDE_ELEMENT
  }
}

/** The tooltip's top-left corner: centred on its anchor and kept inside the frame. */
export function placeTooltip(anchor: TooltipAnchor, size: Size, frame: Size): Point {
  const rightmost = frame.width - size.width - EDGE_MARGIN
  const x = Math.max(EDGE_MARGIN, Math.min(anchor.x - size.width / 2, rightmost))
  const fitsBelow = anchor.below + size.height <= frame.height - EDGE_MARGIN
  const y = fitsBelow ? anchor.below : Math.max(EDGE_MARGIN, anchor.above - size.height)
  return { x, y }
}
