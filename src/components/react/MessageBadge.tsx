import { cn } from '@/lib/utils'

interface Props {
  badgeName: string
  className?: string
}

export function MessageBadge(props: Props) {
  return (
    <span
      className={cn(
        'px-1.5 py-0.5 rounded text-xs font-mono font-medium shrink-0',
        props.className
      )}
    >
      {props.badgeName}
    </span>
  )
}
