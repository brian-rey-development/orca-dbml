import type { TargetedKeyboardEvent } from 'preact'
import { Search } from 'lucide-preact'

type SearchBoxProps = {
  readonly onFind: (query: string) => void
}

const ICON_SIZE = 13

function handleSearchKey(
  event: TargetedKeyboardEvent<HTMLInputElement>,
  onFind: (query: string) => void
): void {
  // Enter while an input method is composing confirms the characters, not the search.
  if (event.isComposing) return
  if (event.key === 'Enter') onFind(event.currentTarget.value)
  if (event.key === 'Escape') event.currentTarget.value = ''
}

export function SearchBox({ onFind }: SearchBoxProps) {
  return (
    <label class="search">
      <Search class="search__icon" size={ICON_SIZE} aria-hidden="true" />
      <input
        class="search__input"
        type="search"
        placeholder="Find table"
        aria-label="Find table"
        spellcheck={false}
        onKeyDown={(event) => handleSearchKey(event, onFind)}
      />
    </label>
  )
}
