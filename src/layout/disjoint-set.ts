/** Joins ids into connected sets; iterative, so a long chain of unions cannot overflow the stack. */
export class DisjointSet {
  private readonly parent = new Map<string, string>()

  constructor(ids: Iterable<string>) {
    for (const id of ids) this.parent.set(id, id)
  }

  has(id: string): boolean {
    return this.parent.has(id)
  }

  find(id: string): string {
    let root = id
    let up = this.parent.get(root)
    while (up !== undefined && up !== root) {
      root = up
      up = this.parent.get(root)
    }
    this.pointAllAt(id, root)
    return root
  }

  union(a: string, b: string): void {
    if (this.has(a) && this.has(b)) this.parent.set(this.find(a), this.find(b))
  }

  private pointAllAt(id: string, root: string): void {
    let current = id
    while (current !== root) {
      const next = this.parent.get(current)
      if (next === undefined) return
      this.parent.set(current, root)
      current = next
    }
  }
}
