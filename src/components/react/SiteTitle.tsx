import { cn } from '@/lib/utils'

export function SiteTitle(props: { className?: string }) {
  return (
    <a href="/" className={cn('font-mono', props.className)}>
      <span className="text-white">console</span>
      <span className="text-orange-400">dump</span>
    </a>
  )
}
