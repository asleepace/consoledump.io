import { withAppProvider, type AppCtx } from './AppContext'
import { AppNavigationBar } from './AppNavigationBar'
import { useAppContext } from './AppContext'
import { cn } from '@/lib/utils'
import { LogEntryItem, type LogEntry } from './LogEntryItem'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { ActionBarEvent } from './ActionBar'
import { Try } from '@asleepace/try'

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

function formatTimestamp(date: Date = new Date()): string {
  const hours = date.getHours().toString().padStart(2, '0')
  const mins = date.getMinutes().toString().padStart(2, '0')
  const secs = date.getSeconds().toString().padStart(2, '0')
  return [hours, mins, secs].join(':')
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
      behavior: ctx.logs.length > 300 ? 'instant' : 'smooth',
    })
  }

  const insertLog = (nextLog: LogEntry) => {
    ctx.setLogs((prev) => [...prev, nextLog])
  }

  const onSubmitAction = useCallback((action: ActionBarEvent) => {
    console.log(`[action:${action.type}] ${action.value}`)
    // handle searching and filtering actions...
    if (action.type === 'search') {
      ctx.searchTerm = action.value
    }

    // handle code executions
    if (action.type === 'execute') {
      const result = Try.catch(() => eval(action.value))
      if (result.ok) return insertLog(makeLog(result.unwrap()))
      insertLog(makeLog(result.error?.message, { type: 'error' }))
    }

    // handle message type actions
    if (action.type === 'message') {
      insertLog(makeLog(action.value))
      scrollToBottom()
      action.reset()
    }
  }, [])

  const autoScroll = useCallback(() => {
    const AUTO_SCROLL_THRESHOLD = 50
    const sv = scrollContainerRef.current
    if (!sv) return
    const containerOffset = sv.scrollHeight - sv.scrollTop
    const isNearBottom = containerOffset <= sv.clientHeight + AUTO_SCROLL_THRESHOLD // 50px threshold
    if (!isNearBottom) return
    const scrollableParent = sv?.parentElement
    if (scrollableParent) {
      scrollableParent.scrollTo({ top: scrollableParent.scrollHeight, behavior: 'instant' })
    }
  }, [])

  useEffect(() => {
    autoScroll()
  }, [ctx.logs])

  return (
    <div className={cn('w-full h-full max-h-screen flex flex-1 flex-col', props.className)}>
      {/* --- site navigation --- */}
      <AppNavigationBar
        isConnected={ctx.isConnected}
        downloadLogs={dowloadLogs}
        scrollToBottom={scrollToBottom}
        clearLogs={clearLogs}
        onSubmitAction={onSubmitAction}
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
