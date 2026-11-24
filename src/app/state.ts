import type { TextLocation } from '../text/location'

export const VIEW_MODES = ['split', 'diagram'] as const

export type ViewMode = (typeof VIEW_MODES)[number]

/** The code pane's share of the editor's width stays between these bounds. */
export const MIN_SPLIT = 0.2
export const MAX_SPLIT = 0.8

/** A request to move the code cursor; a new `sequence` repeats a jump to the same place. */
export type RevealRequest = {
  readonly location: TextLocation
  readonly sequence: number
}
