import type { ComponentChildren } from 'preact'
import type { LucideIcon } from 'lucide-preact'

const ICON_SIZE = 15

type IconButtonProps = {
  /** The tooltip, and the accessible name when the button shows no text of its own. */
  readonly label: string
  readonly icon: LucideIcon
  readonly onClick: () => void
  readonly disabled?: boolean
  readonly pressed?: boolean
  readonly expanded?: boolean
  /** The id of the element this button shows or hides. */
  readonly controls?: string
  readonly className?: string
  readonly children?: ComponentChildren
}

export function IconButton(props: IconButtonProps) {
  const { label, icon: Icon, className, children } = props
  return (
    <button
      type="button"
      class={className ? `icon-button ${className}` : 'icon-button'}
      title={label}
      aria-label={children ? undefined : label}
      aria-pressed={props.pressed}
      aria-expanded={props.expanded}
      aria-controls={props.controls}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      <Icon size={ICON_SIZE} aria-hidden="true" />
      {children}
    </button>
  )
}

export type SegmentOption = {
  readonly label: string
  readonly icon: LucideIcon
}

type SegmentedControlProps<T extends string> = {
  readonly label: string
  readonly value: T
  /** The choices in display order. */
  readonly values: readonly T[]
  readonly options: Readonly<Record<T, SegmentOption>>
  readonly onChange: (value: T) => void
}

export function SegmentedControl<T extends string>(props: SegmentedControlProps<T>) {
  const { label, value, values, options, onChange } = props
  return (
    <div class="segmented" role="group" aria-label={label}>
      {values.map((choice) => (
        <IconButton
          key={choice}
          label={options[choice].label}
          icon={options[choice].icon}
          pressed={choice === value}
          onClick={() => onChange(choice)}
        />
      ))}
    </div>
  )
}
