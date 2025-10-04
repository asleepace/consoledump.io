import { withAppProvider } from './AppContext'
import { AppNavigationBar } from './NavigationBar'
import { useAppContext } from '@/hooks/useAppContext'
import { cn } from '@/lib/utils'
import { LogEntryItem } from './LogEntryItem'

export type ConsoleDumpClientProps = {
  className?: string
}

/**
 * ## Console Dump Client
 *
 * This is the main client application container which displays the app navigation,
 * console messages, side panels, etc.
 *
 * @note see src/pages/[slug]/index.ts for usage.
 */
export const ConsoleDumpClient = withAppProvider((props: ConsoleDumpClientProps) => {
  const ctx = useAppContext()
  console.log('[ConsoleDumpClient] ctx:', ctx)

  return (
    <div className={cn('w-full h-full max-h-screen flex flex-1 flex-col', props.className)}>
      {/* --- site navigation --- */}
      <AppNavigationBar />

      {/* --- main context --- */}
      <main className="w-full max-w-full flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto pb-32">
          {/* --- messages --- */}
          {ctx.logs.map((logEntry) => {
            return <LogEntryItem {...logEntry} key={logEntry.id} />
          })}
        </div>
      </main>
    </div>
  )
})
