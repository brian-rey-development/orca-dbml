import { applyHunks, diffLines, splitLines, type LineHunk } from './line-diff'

/**
 * Combines an outside edit and a local edit made from the same `base`, line by line as git
 * does. Every change survives when the two sides touch different lines; where they touch the same
 * lines, the outside version of those lines wins, because the file on disk is what agents and
 * other tabs work from.
 */
export function mergeEdits(base: string, outside: string, mine: string): string {
  if (outside === base || outside === mine) return mine
  if (mine === base) return outside
  const baseLines = splitLines(base)
  const theirs = diffLines(baseLines, splitLines(outside))
  const ours = diffLines(baseLines, splitLines(mine))
  const kept = ours.filter((hunk) => !theirs.some((other) => overlap(hunk, other)))
  return applyHunks(baseLines, [...theirs, ...kept])
}

// Two insertions at the same line conflict too: neither order is right without a person.
function overlap(a: LineHunk, b: LineHunk): boolean {
  if (a.from === b.from) return true
  return a.from < b.to && b.from < a.to
}
