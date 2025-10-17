import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

export const LabeledInput = forwardRef<
  HTMLInputElement,
  {
    label: string
    className?: string
    placeholder?: string
    defaultValue?: string
    onChange?: (text: string) => void
  }
>(({ label, className, placeholder, defaultValue, onChange }, ref) => {
  return (
    <div className="flex w-full flex-col shrink">
      <label className="px-1 pb-1.5 text-sm text-neutral-400 font-medium">
        {label}
      </label>
      <input
        ref={ref}
        defaultValue={defaultValue}
        onChange={(ev) => onChange?.(ev.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full h-10 bg-white/5 border border-white/10 p-3 text-neutral-100 font-mono rounded-lg mb-2',
          'focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400/50',
          'placeholder:text-neutral-600 transition-all',
          className
        )}
        type="text"
      />
    </div>
  )
})
