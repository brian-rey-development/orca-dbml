import type { TargetedFocusEvent, TargetedKeyboardEvent } from 'preact'
import { useRef, useState } from 'preact/hooks'

/** A menu that closes when focus leaves it or Escape is pressed, which returns focus to its button. */
export function useDisclosureMenu() {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  const closeWhenFocusLeaves = (event: TargetedFocusEvent<HTMLDivElement>): void => {
    const next = event.relatedTarget
    if (!(next instanceof Node) || !event.currentTarget.contains(next)) setOpen(false)
  }

  const closeOnEscape = (event: TargetedKeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== 'Escape' || !open) return
    setOpen(false)
    root.current?.querySelector('button')?.focus()
  }

  return { open, setOpen, root, closeWhenFocusLeaves, closeOnEscape }
}
