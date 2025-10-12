import { withAppProvider } from './AppContext'
import { AppNavigationBar } from './AppNavigationBar'
import { useAppContext } from '@/hooks/useAppContext'
import { cn } from '@/lib/utils'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ActionBarEvent } from './ActionBar'
import { Try } from '@asleepace/try'
import { useUtils } from '@/hooks/useUtils'
import { MessageItem } from './MessageItem'
import { InfoPanel } from './InfoPanel'

export type ConsoleDumpClientProps = {
  initialUrl: URL
  className?: string
}

async function dump(...args: any[]): Promise<void> {
  if (typeof window === 'undefined')
    return console.warn('[dump] window not defined!')
  await fetch(window.location.pathname, {
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
export const ConsoleDumpClient = withAppProvider(
  (props: ConsoleDumpClientProps) => {
    const ctx = useAppContext()
    const utils = useUtils()

    const scrollContainerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      // define dump on the client:
      console.dump = dump
      window.dump = dump

      // define other utils
      Object.defineProperty(Number.prototype, 'for', {
        value(this: Number, callback: <T>(i: number) => T[]) {
          const end = Math.floor(this.valueOf())
          const res = []
          for (let i = 0; i < end; i++) {
            res.push(callback(i))
          }
          return res
        },
      })
    }, [])

    const downloadLogs = () => {
      if (!ctx.sessionId) return
      const data = utils.createJsonDataFile({
        sessionId: ctx.sessionId,
        logs: [],
      })
      utils.downloadJsonFile({ fileName: `${ctx.sessionId}.log`, data })
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

    const toggleInfoPanel = () => {
      ctx.setIsInfoPanelOpen((prev) => !prev)
    }

    const autoScroll = useCallback(() => {
      const AUTO_SCROLL_THRESHOLD = 100
      const sv = scrollContainerRef.current
      if (!sv) return
      const containerOffset = sv.scrollHeight - sv.scrollTop
      const isNearBottom =
        containerOffset <= sv.clientHeight + AUTO_SCROLL_THRESHOLD // 50px threshold
      if (!isNearBottom) return
      const scrollableParent = sv?.parentElement
      if (scrollableParent) {
        scrollableParent.scrollTo({
          top: scrollableParent.scrollHeight,
          behavior: 'instant',
        })
      }
    }, [])

    useEffect(() => {
      autoScroll()
    }, [ctx.stream?.events.length])

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
          dump(res.error?.name ?? 'an unknown error occurred.').then(
            scrollToBottom
          )
          return
        default:
          console.warn(`[main] unsupported action: "${action.type}"`)
          return
      }
    }, [])

    const msgs = useMemo(() => {
      return (
        ctx.stream?.events.map((msg, i) => {
          const msgKey = `${msg.type}-${msg.lastEventId}-${i}`
          return <MessageItem message={msg} key={msgKey} />
        }) ?? []
      )
    }, [ctx.stream?.events])

    return (
      <div
        className={cn(
          'w-full h-full max-h-screen flex flex-1 flex-col',
          props.className
        )}
      >
        {/* --- site navigation --- */}
        <AppNavigationBar
          isConnected={ctx.stream?.isConnected}
          onOpenInfoPanel={toggleInfoPanel}
          scrollToBottom={scrollToBottom}
          onSubmitAction={onSubmitAction}
          downloadLogs={downloadLogs}
          clearLogs={clearLogs}
        />

        {/* --- main context --- */}
        <main className="w-full max-w-full flex-1 flex flex-col overflow-hidden">
          <InfoPanel url={props.initialUrl} />

          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pb-4">
            {msgs}
          </div>
        </main>
      </div>
    )
  }
)
