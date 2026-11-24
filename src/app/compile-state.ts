import type { CompileResult, Diagnostic, Schema } from '../schema/model'
import { locationMap, type LocationMap } from '../text/location'

/** The latest compile, with every location in it pointing into the current text. */
export type CompiledSchema = {
  /** The latest schema that compiled, kept while the text has errors so the diagram stays useful. */
  readonly schema: Schema | null
  /** Where a location in `schema` sits in the current text, which may have moved on since. */
  readonly locateInText: LocationMap
  readonly diagnostics: readonly Diagnostic[]
  /** True while `schema` is older than the text, because the text does not compile. */
  readonly stale: boolean
  /** True until the first compile finishes. */
  readonly pending: boolean
}

/** What the compiles so far produced, with the text each part came from. */
export type CompileState = {
  readonly schema: Schema | null
  readonly schemaSource: string
  readonly diagnostics: readonly Diagnostic[]
  readonly diagnosticsSource: string
  readonly stale: boolean
  readonly pending: boolean
}

export const NOTHING_COMPILED: CompileState = {
  schema: null,
  schemaSource: '',
  diagnostics: [],
  diagnosticsSource: '',
  stale: false,
  pending: true
}

export function afterCompile(
  previous: CompileState,
  text: string,
  result: CompileResult
): CompileState {
  const diagnostics = { diagnostics: result.diagnostics, diagnosticsSource: text, pending: false }
  if (result.schema)
    return { ...diagnostics, schema: result.schema, schemaSource: text, stale: false }
  return { ...previous, ...diagnostics, stale: previous.schema !== null }
}

export function inCurrentText(state: CompileState, text: string): CompiledSchema {
  return {
    schema: state.schema,
    locateInText: locationMap(state.schemaSource, text),
    diagnostics: mapDiagnostics(state.diagnostics, state.diagnosticsSource, text),
    stale: state.stale,
    pending: state.pending
  }
}

function mapDiagnostics(
  diagnostics: readonly Diagnostic[],
  source: string,
  text: string
): readonly Diagnostic[] {
  if (source === text) return diagnostics
  const locate = locationMap(source, text)
  return diagnostics.map((diagnostic) => ({
    ...diagnostic,
    range: { start: locate(diagnostic.range.start), end: locate(diagnostic.range.end) }
  }))
}
