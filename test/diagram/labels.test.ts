import { describe, expect, it } from 'vitest'
import { describeColumn, describeRelation } from '../../src/diagram/labels'
import { compileDbml } from '../../src/schema/compile'

const { schema } = compileDbml(`
  Enum status { active
    archived }
  Table accounts { id int [pk, increment]
    region varchar [pk]
    state status [not null, default: 'active', note: 'Lifecycle'] }
  Table invoices { id int [pk]
    account_id int
    region varchar }
  Ref billing: invoices.(account_id, region) > accounts.(id, region) [delete: cascade, update: no action]`)

describe('describeRelation', () => {
  it('writes the relationship as DBML, with its name and actions', () => {
    const relation = schema?.relations[0]
    if (!relation) throw new Error('expected a relation')
    expect(describeRelation(relation, { from: 'invoices', to: 'accounts' })).toBe(
      [
        'billing',
        'invoices.(account_id, region) > accounts.(id, region)',
        'on delete cascade',
        'on update no action'
      ].join('\n')
    )
  })
})

describe('describeColumn', () => {
  it('lists the column type, constraints, default, enum values and note', () => {
    const columns = schema?.tables[0]?.columns ?? []
    expect(describeColumn(columns[0] ?? fail())).toBe('id: int\nprimary key, increment')
    expect(describeColumn(columns[2] ?? fail())).toBe(
      "state: status\nnot null, default 'active'\none of active, archived\nLifecycle"
    )
  })
})

function fail(): never {
  throw new Error('expected a column')
}
