import type { TextLocation } from '../text/location'

export type SourceRange = {
  readonly start: TextLocation
  readonly end: TextLocation
}

export type Column = {
  readonly name: string
  readonly type: string
  readonly primaryKey: boolean
  readonly unique: boolean
  readonly notNull: boolean
  readonly increment: boolean
  readonly foreignKey: boolean
  readonly defaultValue: string | null
  readonly note: string | null
  /** The allowed values when the column's type is an enum of this schema. */
  readonly enumValues: readonly string[] | null
}

export type Table = {
  readonly key: string
  readonly name: string
  readonly displayName: string
  readonly alias: string | null
  readonly color: string | null
  readonly note: string | null
  readonly columns: readonly Column[]
  readonly range: SourceRange
}

export type RelationEnd = {
  readonly tableKey: string
  readonly columns: readonly string[]
  readonly many: boolean
  readonly optional: boolean
}

export type RelationKind = 'many-to-one' | 'one-to-one' | 'many-to-many'

/**
 * A relationship oriented the way databases store it: `from` is the referencing end, which holds
 * the foreign key when there is one, and `to` is the referenced end.
 */
export type Relation = {
  readonly id: string
  readonly name: string | null
  readonly kind: RelationKind
  readonly from: RelationEnd
  readonly to: RelationEnd
  readonly hasForeignKey: boolean
  readonly color: string | null
  readonly onDelete: string | null
  readonly onUpdate: string | null
}

export type EnumValue = {
  readonly name: string
  readonly note: string | null
}

export type EnumType = {
  readonly key: string
  readonly displayName: string
  readonly values: readonly EnumValue[]
}

export type TableGroup = {
  readonly id: string
  readonly name: string
  readonly color: string | null
  readonly note: string | null
  readonly tableKeys: readonly string[]
}

export type StickyNote = {
  readonly key: string
  readonly name: string
  readonly content: string
  readonly color: string | null
  readonly range: SourceRange
}

export type Schema = {
  /** The name from the DBML `Project` block, if the file has one. */
  readonly projectName: string | null
  readonly tables: readonly Table[]
  readonly relations: readonly Relation[]
  readonly enums: readonly EnumType[]
  readonly groups: readonly TableGroup[]
  readonly notes: readonly StickyNote[]
}

export type DiagnosticSeverity = 'error' | 'warning'

export type Diagnostic = {
  readonly severity: DiagnosticSeverity
  readonly message: string
  readonly range: SourceRange
}

export type CompileResult = {
  readonly schema: Schema | null
  readonly diagnostics: readonly Diagnostic[]
}
