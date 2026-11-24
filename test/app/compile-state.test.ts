import { describe, expect, it } from 'vitest'
import { afterCompile, inCurrentText, NOTHING_COMPILED } from '../../src/app/compile-state'
import { compileDbml } from '../../src/schema/compile'

const VALID = 'Table users {\n  id int\n}\n'
const BROKEN = 'Table users {\n  id int\n'

describe('compile state', () => {
  it('keeps the last good schema while the text has errors, and marks it stale', () => {
    const good = afterCompile(NOTHING_COMPILED, VALID, compileDbml(VALID))
    const broken = afterCompile(good, BROKEN, compileDbml(BROKEN))
    const shown = inCurrentText(broken, BROKEN)
    expect(shown.schema).toBe(good.schema)
    expect(shown.stale).toBe(true)
    expect(shown.pending).toBe(false)
    expect(shown.diagnostics.length).toBeGreaterThan(0)
  })

  it('is not stale when nothing ever compiled', () => {
    const broken = afterCompile(NOTHING_COMPILED, BROKEN, compileDbml(BROKEN))
    expect(inCurrentText(broken, BROKEN)).toMatchObject({ schema: null, stale: false })
  })

  it('clears the stale mark on the next good compile', () => {
    const broken = afterCompile(
      afterCompile(NOTHING_COMPILED, VALID, compileDbml(VALID)),
      BROKEN,
      compileDbml(BROKEN)
    )
    const fixed = `${VALID}Table posts {\n  id int\n}\n`
    const shown = inCurrentText(afterCompile(broken, fixed, compileDbml(fixed)), fixed)
    expect(shown.stale).toBe(false)
    expect(shown.schema?.tables.map((table) => table.name)).toEqual(['users', 'posts'])
  })

  it('moves diagnostics and schema locations along with edits made since the compile', () => {
    const state = afterCompile(NOTHING_COMPILED, BROKEN, compileDbml(BROKEN))
    const edited = `// a comment added above\n${BROKEN}`
    const before = inCurrentText(state, BROKEN).diagnostics[0]?.range.start
    const after = inCurrentText(state, edited).diagnostics[0]?.range.start
    expect(after?.line).toBe((before?.line ?? 0) + 1)
    const good = afterCompile(NOTHING_COMPILED, VALID, compileDbml(VALID))
    const validEdited = `// a comment added above\n${VALID}`
    expect(inCurrentText(good, validEdited).locateInText({ line: 1, column: 1 })).toEqual({
      line: 2,
      column: 1
    })
  })
})
