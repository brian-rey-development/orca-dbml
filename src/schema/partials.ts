import type {
  Column as RawColumn,
  Index as RawIndex,
  Table as RawTable,
  TablePartial as RawTablePartial
} from '@dbml/parse'

type Injection = {
  readonly order: number
  readonly partial: RawTablePartial
}

type Slot = { readonly own: RawColumn } | { readonly injection: Injection }

export type InjectedField = {
  readonly column: RawColumn
  readonly fromPartial: boolean
}

export type MergedTable = {
  readonly fields: readonly InjectedField[]
  readonly indexes: readonly RawIndex[]
  readonly headerColor: string | null
  readonly note: string | null
}

// Mirrors how @dbml/core resolves `~partial` injections, so the diagram shows the same columns the
// official exporters produce: own fields win, then the partial injected last wins.
export function mergePartials(
  table: RawTable,
  partials: ReadonlyMap<string, RawTablePartial>
): MergedTable {
  const injections = resolveInjections(table, partials)
  const lastFirst = [...injections].sort((a, b) => b.order - a.order)
  return {
    fields: mergeFields(table.fields, injections, lastFirst),
    indexes: [...table.indexes, ...lastFirst.flatMap(({ partial }) => partial.indexes)],
    headerColor: table.headerColor ?? firstDefined(lastFirst, (p) => p.headerColor),
    note: table.note?.value ?? firstDefined(lastFirst, (p) => p.note?.value)
  }
}

function resolveInjections(
  table: RawTable,
  partials: ReadonlyMap<string, RawTablePartial>
): Injection[] {
  return table.partials
    .flatMap(({ name, order }) => {
      const partial = partials.get(name)
      return partial ? [{ order, partial }] : []
    })
    .sort((a, b) => a.order - b.order)
}

function mergeFields(
  own: readonly RawColumn[],
  ascending: readonly Injection[],
  lastFirst: readonly Injection[]
): InjectedField[] {
  const slots: Slot[] = own.map((column) => ({ own: column }))
  ascending.forEach((injection) => slots.splice(injection.order, 0, { injection }))
  const resolved = resolveInjectedColumns(own, lastFirst)
  return slots.flatMap<InjectedField>((slot) =>
    'own' in slot
      ? [{ column: slot.own, fromPartial: false }]
      : (resolved.get(slot.injection) ?? []).map((column) => ({ column, fromPartial: true }))
  )
}

function resolveInjectedColumns(
  own: readonly RawColumn[],
  lastFirst: readonly Injection[]
): Map<Injection, RawColumn[]> {
  const taken = new Set(own.map((column) => column.name))
  const resolved = new Map<Injection, RawColumn[]>()
  for (const injection of lastFirst) {
    const fresh = injection.partial.fields.filter((column) => !taken.has(column.name))
    fresh.forEach((column) => taken.add(column.name))
    resolved.set(injection, fresh)
  }
  return resolved
}

function firstDefined<T>(
  injections: readonly Injection[],
  pick: (partial: RawTablePartial) => T | undefined
): T | null {
  for (const { partial } of injections) {
    const value = pick(partial)
    if (value !== undefined) return value
  }
  return null
}
