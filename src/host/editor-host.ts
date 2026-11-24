export type Disposable = {
  dispose(): void
}

/** The open file, kept in sync with Orca: the editor's edits go out, outside writes come in. */
export type DocumentSession = {
  /** The latest text, including edits Orca has not accepted yet. */
  readonly value: string
  /** Fixed for the session; Orca has no event for a change. */
  readonly readOnly: boolean
  change(text: string): void
  /** Sends pending edits now; rejects when Orca refuses them. */
  flush(): Promise<void>
  /** The file changed outside the editor; never called for the editor's own accepted edits. */
  onReplace(handler: (text: string) => void): Disposable
}

export type SaveRequest = {
  readonly suggestedName: string
  readonly mimeType: string
  readonly data: string | ArrayBuffer
}

/** `needs-gesture`: Orca opens the dialog only within a few seconds of a click or key press. */
export type SaveOutcome = 'saved' | 'cancelled' | 'needs-gesture'

export type EditorHost = {
  readonly document: DocumentSession
  /** Null where the host offers no save dialog, such as Orca's browser clients. */
  readonly saveFile: ((request: SaveRequest) => Promise<SaveOutcome>) | null
  onThemeChange(handler: () => void): Disposable
}
