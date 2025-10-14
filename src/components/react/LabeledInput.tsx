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
      <label className="px-1 text-sm text-zinc-400">{label}</label>
      <input
        ref={ref}
        defaultValue={defaultValue}
        onChange={(ev) => onChange?.(ev.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full h-8 bg-zinc-700 p-2 text-zinc-100 font-mono tracking-wider rounded mb-2',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500/50',
          className
        )}
        type="text"
      />
    </div>
  )
})
