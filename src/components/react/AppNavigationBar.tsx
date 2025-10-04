import { Terminal } from 'lucide-react'
import { SiteTitle } from './SiteTitle'

export function AppNavigationBar(props: {}) {
  return (
    <nav className="sticky top-0 w-full bg-black p-4 flex items-center">
      <div className="gap-2 flex items-center">
        <Terminal className="text-blue-400" size={16} />
        <SiteTitle />
      </div>
    </nav>
  )
}
