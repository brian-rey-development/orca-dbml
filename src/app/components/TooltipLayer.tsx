import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'
import type { Point } from '../../layout/geometry'
import { placeTooltip, TooltipWatcher, WATCHED_EVENTS, type Tooltip } from '../tooltip-watcher'

const LISTEN = { capture: true, passive: true } as const

/** Draws the tooltip of whatever element the person rests the pointer on or tabs to. */
export function TooltipLayer() {
  const tooltip = useTooltip()
  const element = useRef<HTMLDivElement>(null)
  const [corner, setCorner] = useState<Point | null>(null)
  // Measured before paint, so the tooltip never flashes at the wrong place.
  useLayoutEffect(() => {
    const box = element.current?.getBoundingClientRect()
    const frame = { width: window.innerWidth, height: window.innerHeight }
    setCorner(tooltip && box ? placeTooltip(tooltip.anchor, box, frame) : null)
  }, [tooltip])
  if (!tooltip) return null
  const style = corner ? { left: corner.x, top: corner.y } : { visibility: 'hidden' as const }
  return (
    <div ref={element} class="tooltip" aria-hidden="true" style={style}>
      {tooltip.text}
    </div>
  )
}

function useTooltip(): Tooltip | null {
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)
  useEffect(() => {
    const watcher = new TooltipWatcher(setTooltip)
    WATCHED_EVENTS.forEach((type) => document.addEventListener(type, watcher, LISTEN))
    return () => {
      WATCHED_EVENTS.forEach((type) => document.removeEventListener(type, watcher, LISTEN))
      watcher.dispose()
    }
  }, [])
  return tooltip
}
