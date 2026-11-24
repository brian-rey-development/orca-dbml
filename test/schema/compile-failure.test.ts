import { describe, expect, it, vi } from 'vitest'
import { compileDbml } from '../../src/schema/compile'

vi.mock('@dbml/parse', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@dbml/parse')>()),
  Compiler: class {
    constructor() {
      throw new Error('internal compiler failure')
    }
  }
}))

describe('compileDbml when the compiler crashes', () => {
  it('reports the crash as an error at the start of the file instead of throwing', () => {
    const { schema, diagnostics } = compileDbml('Table users { id int }')
    expect(schema).toBeNull()
    expect(diagnostics).toEqual([
      {
        severity: 'error',
        message: 'The DBML compiler could not read this file: internal compiler failure',
        range: { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }
      }
    ])
  })
})
