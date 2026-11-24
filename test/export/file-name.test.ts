import { describe, expect, it } from 'vitest'
import { exportFileName } from '../../src/export/file-name'
import { compileDbml } from '../../src/schema/compile'

function schemaWithProject(name: string) {
  return compileDbml(`Project "${name}" { database_type: 'PostgreSQL' }\nTable a { id int }`).schema
}

describe('exportFileName', () => {
  it('names the file after the DBML project', () => {
    expect(exportFileName(schemaWithProject('Online Store'), 'png')).toBe(
      'online-store-diagram.png'
    )
  })

  it('keeps letters from any language', () => {
    expect(exportFileName(schemaWithProject('Tienda Ñandú'), 'svg')).toBe(
      'tienda-ñandú-diagram.svg'
    )
  })

  it('falls back to a generic name', () => {
    expect(exportFileName(null, 'svg')).toBe('schema-diagram.svg')
    expect(exportFileName(schemaWithProject('***'), 'svg')).toBe('schema-diagram.svg')
  })
})
