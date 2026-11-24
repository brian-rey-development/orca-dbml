import { Download, FileCode, FileImage } from 'lucide-preact'
import type { ExportFormat } from '../../export/diagram-export'
import { useDisclosureMenu } from '../hooks/use-disclosure-menu'
import { IconButton } from './controls'

type ExportMenuProps = {
  readonly disabled: boolean
  readonly onExport: (format: ExportFormat) => void
}

export function ExportMenu({ disabled, onExport }: ExportMenuProps) {
  const { open, setOpen, root, closeWhenFocusLeaves, closeOnEscape } = useDisclosureMenu()
  const choose = (format: ExportFormat): void => {
    setOpen(false)
    onExport(format)
  }
  return (
    <div class="menu" ref={root} onFocusOut={closeWhenFocusLeaves} onKeyDown={closeOnEscape}>
      <IconButton
        label="Export diagram"
        icon={Download}
        disabled={disabled}
        expanded={open}
        onClick={() => setOpen(!open)}
      />
      {open ? <ExportOptions onChoose={choose} /> : null}
    </div>
  )
}

function ExportOptions({ onChoose }: { readonly onChoose: (format: ExportFormat) => void }) {
  return (
    <div class="menu__list">
      <IconButton label="Export as PNG image" icon={FileImage} onClick={() => onChoose('png')}>
        PNG image
      </IconButton>
      <IconButton label="Export as SVG vector" icon={FileCode} onClick={() => onChoose('svg')}>
        SVG vector
      </IconButton>
    </div>
  )
}
