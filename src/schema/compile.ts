import {
  Compiler,
  DEFAULT_ENTRY,
  MemoryProjectLayout,
  type CompileError,
  type CompileWarning
} from '@dbml/parse'
import { buildSchema } from './mapping'
import type { CompileResult, Diagnostic, DiagnosticSeverity } from './model'
import { diagnosticLocation } from './source'

const BYTE_ORDER_MARK = '\uFEFF'
const START_OF_FILE = { line: 1, column: 1 }

/** Compiles DBML text into a schema and its diagnostics. Never throws: a crash is a diagnostic. */
export function compileDbml(source: string): CompileResult {
  try {
    return compile(withoutByteOrderMark(source))
  } catch (error) {
    return { schema: null, diagnostics: [compilerFailure(error)] }
  }
}

// The compiler reads a byte order mark as a stray token. A space keeps every position unchanged.
function withoutByteOrderMark(source: string): string {
  return source.startsWith(BYTE_ORDER_MARK) ? ` ${source.slice(1)}` : source
}

function compile(source: string): CompileResult {
  const layout = new MemoryProjectLayout()
  layout.setSource(DEFAULT_ENTRY, source)
  const compiler = new Compiler(layout)
  const errors = compiler.parse.errors(DEFAULT_ENTRY).map((e) => toDiagnostic(e, 'error'))
  const warnings = compiler.parse.warnings(DEFAULT_ENTRY).map((w) => toDiagnostic(w, 'warning'))
  const raw = errors.length === 0 ? compiler.parse.rawDb(DEFAULT_ENTRY) : undefined
  return {
    schema: raw ? buildSchema(raw) : null,
    diagnostics: [...errors, ...warnings].sort(
      (a, b) =>
        a.range.start.line - b.range.start.line || a.range.start.column - b.range.start.column
    )
  }
}

function toDiagnostic(
  issue: Readonly<CompileError | CompileWarning>,
  severity: DiagnosticSeverity
): Diagnostic {
  return {
    severity,
    message: issue.diagnostic,
    range: {
      start: diagnosticLocation(issue.nodeOrToken.startPos),
      end: diagnosticLocation(issue.nodeOrToken.endPos)
    }
  }
}

function compilerFailure(error: unknown): Diagnostic {
  const reason = error instanceof Error ? error.message : String(error)
  return {
    severity: 'error',
    message: `The DBML compiler could not read this file: ${reason}`,
    range: { start: START_OF_FILE, end: START_OF_FILE }
  }
}
