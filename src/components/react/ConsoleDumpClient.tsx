import { withAppProvider, type AppCtx } from './AppContext'
import { AppNavigationBar } from './AppNavigationBar'
import { useAppContext } from '@/hooks/useAppContext'
import { cn } from '@/lib/utils'
import { LogEntryItem } from './LogEntryItem'
import { useMemo, useRef } from 'react'

export type ConsoleDumpClientProps = {
  className?: string
}

function createJsonDataFile(ctx: AppCtx) {
  return JSON.stringify(
    {
      url: window.location.href,
      sessionId: window.location.pathname.slice(1),
      timestamp: new Date(),
      logs: ctx.logs,
    },
    null,
    2
  )
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

  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const dowloadLogs = () => {
    const sessionId = window.location.pathname.slice(1)
    const json = createJsonDataFile(ctx)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dump-${sessionId}-${new Date().toDateString()}.json`.replaceAll(' ', '-')
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const clearLogs = () => {
    console.warn('clearing logs...')
    ctx.setLogs([])
  }

  const scrollToBottom = () => {
    console.log('scrolling to bottom...')
    scrollContainerRef.current?.scrollTo({
      top: scrollContainerRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }

  return (
    <div className={cn('w-full h-full max-h-screen flex flex-1 flex-col', props.className)}>
      {/* --- site navigation --- */}
      <AppNavigationBar
        isConnected={ctx.isConnected}
        downloadLogs={dowloadLogs}
        scrollToBottom={scrollToBottom}
        clearLogs={clearLogs}
      />

      {/* --- main context --- */}
      <main className="w-full max-w-full flex-1 flex flex-col overflow-hidden">
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pb-4">
          {ctx.logs.map((logEntry) => {
            return <LogEntryItem {...logEntry} key={logEntry.id} />
          })}
        </div>
      </main>
    </div>
  )
})
