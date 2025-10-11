import { formatTimestamp } from '@/hooks/useUtils'
import { cn } from '@/lib/utils'

export const MessageTimestamp = ({
  className,
  timestamp = new Date(),
}: {
  className?: string
  timestamp?: Date
}) => {
  return (
    <span
      className={cn(
        'text-xs text-zinc-400/40 font-mono shrink-0 w-16',
        className
      )}
    >
      {formatTimestamp(timestamp)}
    </span>
  )
}
