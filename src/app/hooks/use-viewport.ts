import type { RefObject } from 'preact'
import { useCallback, useEffect, useState } from 'preact/hooks'
import {
  centerOn,
  fitBounds,
  IDENTITY_VIEWPORT,
  zoomAt,
  type Viewport,
  type ViewportUpdate
} from '../../diagram/viewport'
import type { Rect, Size } from '../../layout/geometry'
import { useElementSize } from './use-element-size'

export type ViewportControls = {
  readonly viewport: Viewport
  readonly screen: Size
  setViewport(update: ViewportUpdate): void
  /** Fits the diagram as soon as it has a size and content; the first diagram fits by itself. */
  requestFit(): void
  zoomBy(factor: number): void
  reveal(target: Rect): void
}

export function useViewport(
  canvas: RefObject<Element | null>,
  contentBounds: Rect | null
): ViewportControls {
  const screen = useElementSize(canvas)
  const [viewport, setViewport] = useState<Viewport>(IDENTITY_VIEWPORT)
  const [fitPending, setFitPending] = useState(true)

  useEffect(() => {
    if (!fitPending || !contentBounds || screen.width === 0) return
    setViewport(fitBounds(contentBounds, screen))
    setFitPending(false)
  }, [fitPending, contentBounds, screen])

  const requestFit = useCallback(() => setFitPending(true), [])

  const zoomBy = useCallback(
    (factor: number) => {
      const center = { x: screen.width / 2, y: screen.height / 2 }
      setViewport((current) => zoomAt(current, center, factor))
    },
    [screen]
  )

  const reveal = useCallback(
    (target: Rect) => setViewport((current) => centerOn(current, target, screen)),
    [screen]
  )

  return { viewport, screen, setViewport, requestFit, zoomBy, reveal }
}
