export type DiagramTheme = {
  readonly canvas: string
  readonly grid: string
  readonly cardFill: string
  readonly cardStroke: string
  readonly headerFill: string
  readonly headerText: string
  readonly text: string
  readonly mutedText: string
  readonly rowDivider: string
  readonly primaryKey: string
  readonly foreignKey: string
  readonly relation: string
  readonly relationActive: string
  readonly selection: string
  readonly noteFill: string
  readonly noteText: string
  readonly groupTint: string
  readonly fontSans: string
  readonly fontMono: string
}

const THEME_VARIABLES: Readonly<Record<keyof DiagramTheme, string>> = {
  canvas: '--dbml-canvas',
  grid: '--dbml-grid',
  cardFill: '--dbml-card',
  cardStroke: '--dbml-card-border',
  headerFill: '--dbml-header',
  headerText: '--dbml-header-text',
  text: '--dbml-text',
  mutedText: '--dbml-muted-text',
  rowDivider: '--dbml-row-divider',
  primaryKey: '--dbml-primary-key',
  foreignKey: '--dbml-foreign-key',
  relation: '--dbml-relation',
  relationActive: '--dbml-relation-active',
  selection: '--dbml-selection',
  noteFill: '--dbml-note',
  noteText: '--dbml-note-text',
  groupTint: '--dbml-group',
  fontSans: '--dbml-font-sans',
  fontMono: '--dbml-font-mono'
}

/** Reads the diagram colors and fonts that diagram.css derives from Orca's theme. */
export function readDiagramTheme(element: Element): DiagramTheme {
  const style = getComputedStyle(element)
  const entries = Object.entries(THEME_VARIABLES).map(([name, variable]) => [
    name,
    style.getPropertyValue(variable).trim()
  ])
  return Object.fromEntries(entries) as DiagramTheme
}
