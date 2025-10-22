import { cn } from '@/lib/utils'
import { memo, useCallback, useMemo, useState } from 'react'
import { copyToClipboard } from '@/lib/client/clipboard'
import { MessageTimestamp } from '@/components/react/MessageTimestamp'
import { MessageBadge } from './MessageBadge'
import { BtnCopyToClipboard } from './Buttons'
import { createPatternMatcher } from '@/lib/client/message'
import { messageParser } from '@/lib/client/message'
import type { AppSettings } from '@/hooks/useSettings'

interface Props {
  app: AppSettings
  message: MessageEvent<string>
  className?: string
}

// --- Default Custom Parsers ---

messageParser.register({
  match: (msg) => msg.event.type === 'client',
  className: 'text-indigo-400',
  renderer() {
    return `connected to stream <a class="text-orange-400" href="${window.location.pathname}">${window.location.href}</a>`
  },
})

messageParser.register({
  match: (msg) => msg.badge.name === 'connected',
  className: 'text-emerald-400',
})

/**
 * ## MessageItem
 *
 * This is the container for console messages which appear in the browser as part of a list,
 * and provide support for actions like expanding, copying, etc.
 */
export const MessageItem = memo(({ className, message, app }: Props) => {
  const [isCopied, setIsCopied] = useState(false)

  const msg = messageParser.parse(message)
  if (Array.isArray(msg.content.data)) {
    console.log(...msg.content.data)
  } else {
    console.log(msg.content.data)
  }

  const onCopied = useCallback(() => {
    setIsCopied(true)
    copyToClipboard(String(message.data))
    setTimeout(() => setIsCopied(false), 1_000)
  }, [])

  const timestamp = useMemo(() => {
    return new Date(Date.now() - message.timeStamp)
      .toLocaleString('en-US', {
        timeStyle: 'medium',
      })
      .replaceAll(/(AM|PM)/gi, '')
      .trim()
  }, [message])

  return (
    <div className={cn('w-full font-mono', className)}>
      <div
        className={cn(
          app.settings.showDividers &&
            'group border-b border-t-transparent hover:border-t-gray-400/10 box-content border-t border-b-gray-400/10 hover:bg-gray-800/50'
        )}
      >
        {/* --- message content --- */}
        <div className={cn('flex items-start gap-3 px-2 py-0.5')}>
          {/* --- metadata --- */}
          <div className={'flex flex-row items-center gap-1 h-6'}>
            <MessageTimestamp
              timestamp={timestamp}
              className={cn(
                'text-zinc-400/30',
                !app.settings.showTimestamp && 'hidden'
              )}
            />
            <MessageBadge
              badgeName={msg.badge.name}
              className={cn(
                'text-zinc-400/30',
                msg.badge.className,
                !app.settings.showBadges && 'hidden'
              )}
            />
          </div>
          {/* --- content --- */}
          <div className="flex-1 min-w-0 min-h-6">
            <span
              className={cn(
                'text-xs font-mono break-all text-zinc-600',
                msg.className
              )}
              dangerouslySetInnerHTML={{ __html: msg.html }}
            ></span>
          </div>
          {/* --- actions --- */}
          <BtnCopyToClipboard
            onClick={onCopied}
            isCopied={isCopied}
            className={cn(isCopied && 'text-zinc-400')}
          />
        </div>
      </div>
    </div>
  )
})
