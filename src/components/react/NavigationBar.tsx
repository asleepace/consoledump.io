import { Terminal } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SiteTitle(props: { className?: string }) {
  return (
    <a href="/" className={cn('font-mono', props.className)}>
      <span className="text-white">console</span>
      <span className="text-orange-400">dump</span>
    </a>
  )
}

/**
 * Navigation bar used in ConsoleDumpClient.tsx
 */
export function AppNavigationBar(props: { className?: string }) {
  return (
    <nav className={cn('sticky top-0 w-full bg-black p-4 flex items-center', props.className)}>
      <div className="gap-2 flex items-center">
        <Terminal className="text-blue-400" size={16} />
        <SiteTitle />
      </div>
    </nav>
  )
}
