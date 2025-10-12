import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface LabeledCheckboxProps {
  label: string
  checked?: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  labelClassName?: string
}

export const LabeledCheckbox = ({
  label,
  checked = false,
  onChange,
  disabled = false,
  className,
  labelClassName,
}: LabeledCheckboxProps) => {
  return (
    <label
      className={cn(
        'flex items-center gap-x-2 cursor-pointer group',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      <span className={cn('text-xs text-zinc-500', labelClassName)}>
        {label}
      </span>

      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />

        <div
          className={cn(
            'w-4 h-4 rounded border-2 transition-all',
            'border-zinc-600 bg-zinc-800',
            'peer-checked:bg-indigo-500 peer-checked:border-indigo-500',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500/50',
            !disabled && 'group-hover:border-zinc-500',
            disabled && 'opacity-50'
          )}
        >
          {checked && (
            <Check
              size={12}
              className="text-white absolute inset-0 m-auto"
              strokeWidth={3}
            />
          )}
        </div>
      </div>
    </label>
  )
}
