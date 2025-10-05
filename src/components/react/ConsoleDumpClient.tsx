import { makeLog, withAppProvider, type AppCtx } from './AppContext'
import { AppNavigationBar } from './AppNavigationBar'
import { useAppContext } from './AppContext'
import { cn } from '@/lib/utils'
import { LogEntryItem, type LogEntry } from './LogEntryItem'
import { useCallback, useEffect, useRef } from 'react'
import type { ActionBarEvent } from './ActionBar'
import { Try } from '@asleepace/try'
import { formatTimestamp, useUtils } from './useUtils'
import { useConsoleDump } from './useConsoleDump'

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

  const dump = useConsoleDump({ sessionId: ctx.sessionId })

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const utils = useUtils()

  const downloadLogs = () => {
    if (!ctx.sessionId) return
    const data = utils.createJsonDataFile({ sessionId: ctx.sessionId, logs: ctx.logs })
    utils.downloadJsonFile(data)
    insertLog(makeLog({ data: `downloaded ${data.fileName}`, type: 'system' }))
  }

  const insertLog = (nextLog: LogEntry) => {
    ctx.setLogs((prev) => [...prev, nextLog])
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

  const onSubmitAction = useCallback((action: ActionBarEvent) => {
    switch (action.type) {
      case 'search':
        ctx.setSearchTerm(action.value)
        return
      case 'message':
        dump({ type: 'message', text: action.value }).then(scrollToBottom)
        action.reset()
        return
      case 'execute':
        const res = Try.catch(() => eval(action.value) ?? '')
        if (res.ok) return insertLog(makeLog(res.value))
        insertLog(makeLog({ data: res.error?.name ?? 'an unknown error occurred.', type: 'error' }))
        return
      default:
        console.warn(`[main] unsupported action: "${action.type}"`)
        return
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
        isConnected={ctx.stream?.isConnected}
        downloadLogs={downloadLogs}
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
