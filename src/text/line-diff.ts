/** Lines `from` to `to` (exclusive) of the old text, replaced by `lines`; an insertion has from === to. */
export type LineHunk = {
  readonly from: number
  readonly to: number
  readonly lines: readonly string[]
}

/** Each line keeps its own line break, so joining the lines gives back the text exactly. */
export function splitLines(text: string): string[] {
  return text.match(/[^\n]*\n|[^\n]+$/g) ?? []
}

export function applyHunks(lines: readonly string[], hunks: readonly LineHunk[]): string {
  const parts: string[] = []
  let cursor = 0
  for (const hunk of [...hunks].sort((a, b) => a.from - b.from)) {
    parts.push(...lines.slice(cursor, hunk.from), ...hunk.lines)
    cursor = hunk.to
  }
  parts.push(...lines.slice(cursor))
  return parts.join('')
}

// Rounds keep O(edits²) numbers; past this many edits the whole range becomes one hunk instead.
const MAX_EDITS = 1000

type Step = 'keep' | 'delete' | 'insert'

/**
 * How far along `before` the furthest path with `edits` edits reached on each diagonal
 * (x - y, from -edits to edits), as Myers' diff algorithm explores them.
 */
type Round = {
  readonly edits: number
  readonly reach: Int32Array
}

/** The fewest whole lines to delete and insert to turn `before` into `after` (Myers' algorithm). */
export function diffLines(before: readonly string[], after: readonly string[]): LineHunk[] {
  const rounds = explore(before, after)
  if (!rounds) return [{ from: 0, to: before.length, lines: after }]
  return hunksOf(backtrack(rounds, before.length, after.length), after)
}

function explore(before: readonly string[], after: readonly string[]): Round[] | null {
  const rounds: Round[] = []
  for (let edits = 0; edits <= MAX_EDITS; edits += 1) {
    const round = { edits, reach: new Int32Array(2 * edits + 1) }
    rounds.push(round)
    for (let diagonal = -edits; diagonal <= edits; diagonal += 2) {
      const x = slide(before, after, diagonal, startOf(rounds[edits - 1], diagonal, edits))
      round.reach[diagonal + edits] = x
      if (x === before.length && x - diagonal === after.length) return rounds
    }
  }
  return null
}

function slide(before: readonly string[], after: readonly string[], diagonal: number, x: number) {
  let end = x
  while (end < before.length && end - diagonal < after.length) {
    if (before[end] !== after[end - diagonal]) break
    end += 1
  }
  return end
}

/** Where a path on `diagonal` starts: one insertion below, or one deletion beside, a previous path. */
function startOf(previous: Round | undefined, diagonal: number, edits: number): number {
  if (!previous) return 0
  return cameFromInsert(previous, diagonal, edits)
    ? reachOf(previous, diagonal + 1)
    : reachOf(previous, diagonal - 1) + 1
}

function cameFromInsert(previous: Round, diagonal: number, edits: number): boolean {
  if (diagonal === -edits) return true
  if (diagonal === edits) return false
  return reachOf(previous, diagonal - 1) < reachOf(previous, diagonal + 1)
}

function reachOf(round: Round, diagonal: number): number {
  return round.reach[diagonal + round.edits] ?? 0
}

/** Walks the rounds back from the end, one edit per round plus the matching lines before it. */
function backtrack(rounds: readonly Round[], beforeLength: number, afterLength: number): Step[] {
  const reversed: Step[] = []
  let x = beforeLength
  let diagonal = beforeLength - afterLength
  for (let edits = rounds.length - 1; edits > 0; edits -= 1) {
    const previous = rounds[edits - 1]
    if (!previous) break
    const fromInsert = cameFromInsert(previous, diagonal, edits)
    const startDiagonal = fromInsert ? diagonal + 1 : diagonal - 1
    const previousX = reachOf(previous, startDiagonal)
    const matchStart = fromInsert ? previousX : previousX + 1
    reversed.push(...keeps(x - matchStart), fromInsert ? 'insert' : 'delete')
    x = previousX
    diagonal = startDiagonal
  }
  return [...keeps(x), ...reversed.reverse()]
}

function keeps(count: number): Step[] {
  return Array<Step>(count).fill('keep')
}

function hunksOf(steps: readonly Step[], after: readonly string[]): LineHunk[] {
  const hunks: LineHunk[] = []
  let x = 0
  let y = 0
  let open: { from: number; to: number; lines: string[] } | null = null
  for (const step of steps) {
    if (step === 'keep') {
      if (open) hunks.push(open)
      open = null
    } else {
      open ??= { from: x, to: x, lines: [] }
      if (step === 'delete') open.to = x + 1
      else open.lines.push(after[y] ?? '')
    }
    if (step !== 'insert') x += 1
    if (step !== 'delete') y += 1
  }
  return open ? [...hunks, open] : hunks
}
