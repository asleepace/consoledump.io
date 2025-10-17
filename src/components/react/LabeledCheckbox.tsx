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
        'flex items-center gap-x-2.5 cursor-pointer group',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      <span
        className={cn('text-sm text-neutral-300 font-medium', labelClassName)}
      >
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
            'w-5 h-5 rounded-md border-2 transition-all',
            'border-white/20 bg-white/5',
            'peer-checked:bg-orange-400 peer-checked:border-orange-400',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-orange-400/50',
            !disabled && 'group-hover:border-white/30',
            disabled && 'opacity-50'
          )}
        >
          {checked && (
            <Check
              size={14}
              className="text-black absolute inset-0 m-auto"
              strokeWidth={3}
            />
          )}
        </div>
      </div>
    </label>
  )
}
