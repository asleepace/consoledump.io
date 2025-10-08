import { withAppProvider, type AppCtx } from './AppContext'
import { AppNavigationBar } from './AppNavigationBar'
import { useAppContext } from './AppContext'
import { cn } from '@/lib/utils'
import { useCallback, useEffect, useRef } from 'react'
import type { ActionBarEvent } from './ActionBar'
import { Try } from '@asleepace/try'
import { useUtils } from './useUtils'
import { MessageItem } from './MessageItem'

export type ConsoleDumpClientProps = {
  className?: string
}

function dump(...args: any[]) {
  return fetch(window.location.pathname, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  })
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
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const utils = useUtils()

  const downloadLogs = () => {
    if (!ctx.sessionId) return
    if (!ctx.stream?.logEntries) return
    const data = utils.createJsonDataFile({ sessionId: ctx.sessionId, logs: ctx.stream.logEntries })
    utils.downloadJsonFile(data)
  }

  const clearLogs = () => {
    console.warn('clearing logs...')
    ctx.stream?.clear()
  }

  const scrollToBottom = () => {
    console.log('scrolling to bottom...')
    scrollContainerRef.current?.scrollTo({
      top: scrollContainerRef.current.scrollHeight,
      behavior: 'instant',
    })
  }

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
  }, [ctx.stream?.logEntries.length])

  const onSubmitAction = useCallback((action: ActionBarEvent) => {
    switch (action.type) {
      // filter out current chat logs.
      case 'search':
        ctx.setSearchTerm(action.value)
        return
      // send a chat like message to the current stream.
      case 'message':
        dump(action.value).then(scrollToBottom)
        action.reset()
        return
      // execute code in the browser.
      case 'execute':
        const res = Try.catch(() => eval(action.value) ?? '')
        if (res.ok) return dump(res.value).then(scrollToBottom)
        dump(res.error?.name ?? 'an unknown error occurred.').then(scrollToBottom)
        return
      default:
        console.warn(`[main] unsupported action: "${action.type}"`)
        return
    }
  }, [])

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
          {ctx.stream?.events.map((message, index) => {
            return <MessageItem message={message} key={`${message.lastEventId ?? 'system'}-${index}`} />
          })}
        </div>
      </main>
    </div>
  )
})
