import type {
  ComponentChildren,
  RefObject,
  TargetedKeyboardEvent,
  TargetedPointerEvent
} from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { clamp } from '../../layout/geometry'
import { capturePointer } from '../../pointer-capture'
import { MAX_SPLIT, MIN_SPLIT } from '../state'

type SplitViewProps = {
  readonly ratio: number
  readonly onRatioChange: (ratio: number) => void
  readonly startVisible: boolean
  readonly start: ComponentChildren
  readonly end: ComponentChildren
}

const KEYBOARD_STEP = 0.05
const PERCENT = 100
const PRIMARY_BUTTON = 0
const ARROW_STEPS: Readonly<Record<string, number>> = {
  ArrowLeft: -KEYBOARD_STEP,
  ArrowRight: KEYBOARD_STEP
}

/**
 * Two panes side by side; the divider drags or moves with the arrow keys. A hidden start pane
 * stays mounted, so the code editor keeps its undo history and cursor while the diagram fills the
 * view.
 */
export function SplitView({ ratio, onRatioChange, startVisible, start, end }: SplitViewProps) {
  const { container, shownRatio, handlers } = useDividerDrag(ratio, onRatioChange, startVisible)
  return (
    <div class="split" ref={container}>
      <div
        class="split__pane"
        hidden={!startVisible}
        style={{ flexBasis: `${shownRatio * PERCENT}%` }}
      >
        {start}
      </div>
      {startVisible ? <Divider ratio={shownRatio} handlers={handlers} /> : null}
      <div class="split__pane split__pane--fill">{end}</div>
    </div>
  )
}

type DividerHandlers = {
  readonly onPointerDown: (event: TargetedPointerEvent<HTMLDivElement>) => void
  readonly onPointerMove: (event: TargetedPointerEvent<HTMLDivElement>) => void
  readonly onPointerUp: () => void
  readonly onPointerCancel: () => void
  readonly onLostPointerCapture: () => void
  readonly onKeyDown: (event: TargetedKeyboardEvent<HTMLDivElement>) => void
}

function Divider({ ratio, handlers }: { ratio: number; handlers: DividerHandlers }) {
  return (
    <div
      class="split__divider"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize code and diagram"
      aria-valuemin={MIN_SPLIT * PERCENT}
      aria-valuemax={MAX_SPLIT * PERCENT}
      aria-valuenow={Math.round(ratio * PERCENT)}
      tabIndex={0}
      {...handlers}
    />
  )
}

/** While dragging, the divider follows the pointer locally and reports one ratio on release. */
function useDividerDrag(
  ratio: number,
  onRatioChange: (ratio: number) => void,
  startVisible: boolean
) {
  const container = useRef<HTMLDivElement>(null)
  const [dragRatio, setDragRatio] = useState<number | null>(null)
  useEffect(() => {
    if (!startVisible) setDragRatio(null)
  }, [startVisible])
  const handlers = dividerHandlers({ container, ratio, dragRatio, setDragRatio, onRatioChange })
  return { container, shownRatio: dragRatio ?? ratio, handlers }
}

type DividerDrag = {
  readonly container: RefObject<HTMLDivElement | null>
  readonly ratio: number
  readonly dragRatio: number | null
  readonly setDragRatio: (ratio: number | null) => void
  readonly onRatioChange: (ratio: number) => void
}

function dividerHandlers(drag: DividerDrag): DividerHandlers {
  const stop = (): void => endDrag(drag)
  return {
    onPointerDown: (event) => {
      if (event.button !== PRIMARY_BUTTON) return
      capturePointer(event.currentTarget, event.pointerId)
      drag.setDragRatio(drag.ratio)
    },
    onPointerMove: (event) => followPointer(drag, event),
    onPointerUp: stop,
    onPointerCancel: stop,
    onLostPointerCapture: stop,
    onKeyDown: (event) => nudgeWithArrows(drag, event.key)
  }
}

function endDrag(drag: DividerDrag): void {
  if (drag.dragRatio !== null) drag.onRatioChange(drag.dragRatio)
  drag.setDragRatio(null)
}

function followPointer(drag: DividerDrag, event: TargetedPointerEvent<HTMLDivElement>): void {
  if (drag.dragRatio === null) return
  if (event.buttons === 0) endDrag(drag)
  else drag.setDragRatio(ratioAt(drag.container, event.clientX) ?? drag.dragRatio)
}

function nudgeWithArrows(drag: DividerDrag, key: string): void {
  const step = ARROW_STEPS[key]
  if (step !== undefined) drag.onRatioChange(clamp(drag.ratio + step, MIN_SPLIT, MAX_SPLIT))
}

function ratioAt(container: RefObject<HTMLDivElement | null>, clientX: number): number | null {
  const box = container.current?.getBoundingClientRect()
  if (!box || box.width === 0) return null
  return clamp((clientX - box.left) / box.width, MIN_SPLIT, MAX_SPLIT)
}
