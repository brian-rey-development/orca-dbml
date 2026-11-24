import { describe, expect, it } from 'vitest'
import { problemsSummary } from '../../src/app/components/ProblemsList'
import type { Diagnostic, DiagnosticSeverity } from '../../src/schema/model'

function problems(...severities: DiagnosticSeverity[]): Diagnostic[] {
  const start = { line: 1, column: 1 }
  return severities.map((severity) => ({ severity, message: '', range: { start, end: start } }))
}

describe('problemsSummary', () => {
  it('counts errors and warnings in words', () => {
    expect(problemsSummary(problems('error'))).toBe('1 error')
    expect(problemsSummary(problems('error', 'error', 'warning'))).toBe('2 errors, 1 warning')
    expect(problemsSummary(problems('warning', 'warning'))).toBe('2 warnings')
    expect(problemsSummary([])).toBe('')
  })
})
