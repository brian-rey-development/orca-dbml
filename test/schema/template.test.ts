import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { compileDbml } from '../../src/schema/compile'

describe('the new-file template', () => {
  it('compiles without problems', () => {
    const template = readFileSync(new URL('../../templates/schema.dbml', import.meta.url), 'utf8')
    const { schema, diagnostics } = compileDbml(template)
    expect(diagnostics).toEqual([])
    expect(schema?.tables.length).toBeGreaterThan(1)
    expect(schema?.relations.length).toBeGreaterThan(0)
  })
})
