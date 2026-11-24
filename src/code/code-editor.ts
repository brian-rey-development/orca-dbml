import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap
} from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { bracketMatching, indentOnInput } from '@codemirror/language'
import {
  lintGutter,
  lintKeymap,
  setDiagnostics,
  type Diagnostic as LintDiagnostic
} from '@codemirror/lint'
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search'
import {
  Annotation,
  Compartment,
  EditorState,
  Text,
  Transaction,
  type Extension,
  type StateEffect
} from '@codemirror/state'
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers
} from '@codemirror/view'
import type { Diagnostic, Schema } from '../schema/model'
import { minimalChange } from '../text/diff'
import { detectLineSeparator, type TextLocation } from '../text/location'
import { dbmlCompletion } from './completion'
import './code.css'
import { dbmlSyntax } from './dbml-language'

export type CodeEditorOptions = {
  readonly parent: HTMLElement
  readonly text: string
  readonly readOnly: boolean
  readonly schema: () => Schema | null
  readonly onChange: (text: string) => void
}

export type CodeEditor = {
  /** Shows text written outside the editor; it is not reported back and is not undoable. */
  replaceText(text: string): void
  setDiagnostics(diagnostics: readonly Diagnostic[]): void
  reveal(location: TextLocation): void
  destroy(): void
}

const outsideWrite = Annotation.define<boolean>()
const lineBreaks = new Compartment()

/** The class code.css styles the editor by. */
export const EDITOR_CLASS = 'dbml-code'

const SELECTION_COLOR = 'color-mix(in srgb, var(--dbml-accent) 25%, transparent)'

const selectionTheme = EditorView.theme({
  '.cm-selectionBackground, &.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground':
    { background: SELECTION_COLOR }
})

export function createCodeEditor(options: CodeEditorOptions): CodeEditor {
  const view = new EditorView({
    parent: options.parent,
    state: EditorState.create({
      doc: options.text,
      extensions: [
        lineBreaks.of(EditorState.lineSeparator.of(detectLineSeparator(options.text))),
        editorExtensions(options),
        editability(options.readOnly)
      ]
    })
  })
  return {
    replaceText: (text) => applyOutsideText(view, text),
    setDiagnostics: (diagnostics) =>
      view.dispatch(setDiagnostics(view.state, toLint(view.state.doc, diagnostics))),
    reveal: (location) => revealLocation(view, location),
    destroy: () => view.destroy()
  }
}

function editorExtensions({ schema, onChange }: CodeEditorOptions): Extension {
  return [
    baseEditing(),
    autocompletion({ override: [dbmlCompletion(schema)] }),
    lintGutter(),
    dbmlSyntax(),
    EditorView.editorAttributes.of({ class: EDITOR_CLASS }),
    selectionTheme,
    editorKeymap(),
    reportPersonEdits(onChange)
  ]
}

function baseEditing(): Extension {
  return [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightActiveLine(),
    history(),
    drawSelection(),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    highlightSelectionMatches(),
    search({ top: true })
  ]
}

function editorKeymap(): Extension {
  return keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...historyKeymap,
    ...completionKeymap,
    ...lintKeymap,
    indentWithTab
  ])
}

// sliceDoc() joins lines with the file's own line break; doc.toString() would always use \n.
function reportPersonEdits(onChange: (text: string) => void): Extension {
  return EditorView.updateListener.of((update) => {
    const fromOutside = update.transactions.some((tr) => tr.annotation(outsideWrite))
    if (update.docChanged && !fromOutside) onChange(update.state.sliceDoc())
  })
}

function editability(readOnly: boolean): Extension {
  return [EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)]
}

// Applied as the smallest change, so the cursor and scroll stay put, and kept out of the undo
// history: undoing an agent's write would send the old text back and overwrite their work.
// The change is worked out on the document's lines, where a line break counts as one character
// whatever the file uses, so its positions are the editor's own. A write may also switch the
// file between LF and CRLF, and the editor then saves with the new line break.
function applyOutsideText(view: EditorView, text: string): void {
  const separator = detectLineSeparator(text)
  const change = minimalChange(view.state.doc.toString(), text.split(separator).join('\n'))
  const effects: StateEffect<unknown>[] =
    view.state.lineBreak === separator
      ? []
      : [lineBreaks.reconfigure(EditorState.lineSeparator.of(separator))]
  if (!change && effects.length === 0) return
  view.dispatch({
    changes: change
      ? { from: change.from, to: change.to, insert: Text.of(change.insert.split('\n')) }
      : [],
    effects,
    annotations: [outsideWrite.of(true), Transaction.addToHistory.of(false)]
  })
}

function revealLocation(view: EditorView, location: TextLocation): void {
  const anchor = positionOf(view.state.doc, location)
  view.dispatch({
    selection: { anchor },
    effects: EditorView.scrollIntoView(anchor, { y: 'center' })
  })
  view.focus()
}

function toLint(doc: Text, diagnostics: readonly Diagnostic[]): LintDiagnostic[] {
  return diagnostics.map((diagnostic) => {
    const from = positionOf(doc, diagnostic.range.start)
    const to = Math.min(Math.max(positionOf(doc, diagnostic.range.end), from + 1), doc.length)
    return { from, to, severity: diagnostic.severity, message: diagnostic.message, source: 'DBML' }
  })
}

// The editor counts every line break as one character, whatever the file uses, so a location is
// found through its lines rather than the file's raw text.
function positionOf(doc: Text, location: TextLocation): number {
  if (location.line > doc.lines) return doc.length
  const line = doc.line(Math.max(location.line, 1))
  return line.from + Math.min(Math.max(location.column - 1, 0), line.length)
}
