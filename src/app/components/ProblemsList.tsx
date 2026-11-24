import { CircleX, TriangleExclamationPoint } from 'lucide-preact'
import type { Diagnostic } from '../../schema/model'

type ProblemsListProps = {
  readonly diagnostics: readonly Diagnostic[]
  readonly onOpen: (diagnostic: Diagnostic) => void
}

const ICON_SIZE = 14

export const PROBLEMS_LIST_ID = 'dbml-problems'

export function ProblemsList({ diagnostics, onOpen }: ProblemsListProps) {
  return (
    <ul class="problems" id={PROBLEMS_LIST_ID} aria-label="Problems">
      {diagnostics.map((diagnostic, index) => (
        <li key={index}>
          <button type="button" class="problems__item" onClick={() => onOpen(diagnostic)}>
            <SeverityIcon diagnostic={diagnostic} />
            <span class="problems__location">
              {diagnostic.range.start.line}:{diagnostic.range.start.column}
            </span>
            <span>{diagnostic.message}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function SeverityIcon({ diagnostic }: { readonly diagnostic: Diagnostic }) {
  if (diagnostic.severity === 'error') {
    return <CircleX class="problems__icon--error" size={ICON_SIZE} aria-label="Error" />
  }
  return (
    <TriangleExclamationPoint
      class="problems__icon--warning"
      size={ICON_SIZE}
      aria-label="Warning"
    />
  )
}

export function problemsSummary(diagnostics: readonly Diagnostic[]): string {
  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === 'error').length
  const warnings = diagnostics.length - errors
  return [plural(errors, 'error'), plural(warnings, 'warning')]
    .filter((part) => part !== null)
    .join(', ')
}

function plural(count: number, noun: string): string | null {
  if (count === 0) return null
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}
