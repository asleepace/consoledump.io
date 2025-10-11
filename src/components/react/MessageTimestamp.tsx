import { formatTimestamp } from '@/hooks/useUtils'
import { cn } from '@/lib/utils'

export const MessageTimestamp = ({
  className,
  timestamp,
}: {
  className?: string
  timestamp: string
}) => {
  return (
    <span
      className={cn(
        'text-xs text-zinc-400/20 font-mono shrink-0 w-16',
        className
      )}
    >
      {timestamp}
    </span>
  )
}
