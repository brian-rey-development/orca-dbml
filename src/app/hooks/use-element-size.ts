import type { RefObject } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import type { Size } from '../../layout/geometry'

const EMPTY: Size = { width: 0, height: 0 }

export function useElementSize(ref: RefObject<Element | null>): Size {
  const [size, setSize] = useState<Size>(EMPTY)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])

  return size
}
