import { cn } from '@/lib/utils'
import { memo, useCallback, useState } from 'react'
import { copyToClipboard } from '@/lib/client/clipboard'
import { MessageTimestamp } from '@/components/react/MessageTimestamp'
import { MessageBadge } from './MessageBadge'
import { BtnCopyToClipboard } from './Buttons'
import { createPatternMatcher } from '@/lib/client/message'

interface Props {
  message: MessageEvent<string>
  className?: string
}

/**
 * Customize how content is displayed.
 */
const matcher = createPatternMatcher([
  {
    match: /(error:|\[error\])/gi,
    badgeName: 'error',
    className: 'text-red-500',
  },
  {
    match: /(warn:|\[warn\])/gi,
    badgeName: 'warn',
    className: 'text-yellow-400',
  },
  {
    match: /(info:|\[info\])/gi,
    badgeName: 'info',
    className: 'text-blue-400',
  },
  {
    match: /(debug:|\[debug\])/gi,
    badgeName: 'debug',
    className: 'text-orange-400',
  },
  { match: /(log:|\[log\])/gi, badgeName: 'log', className: 'text-zinc-400' },
  {
    match: (msg) => msg.event.type === 'client',
    className: 'text-indigo-400',
    renderer() {
      return `connected to stream <a class="text-orange-400" href="${window.location.pathname}">${window.location.href}</a>`
    },
  },
  {
    match: (msg) => msg.badge.name === 'connected',
    className: 'text-emerald-400',
  },
])

/**
 * ## MessageItem
 *
 * This is the container for console messages which appear in the browser as part of a list,
 * and provide support for actions like expanding, copying, etc.
 */
export const MessageItem = memo(({ className, message }: Props) => {
  const [isCopied, setIsCopied] = useState(false)

  const msg = matcher.parse(message)
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

  return (
    <div className={cn('w-full font-mono', className)}>
      <div
        className={
          'group border-b border-t-transparent hover:border-t-gray-400/10 box-content border-t border-b-gray-400/10 hover:bg-gray-800/50'
        }
      >
        {/* --- message content --- */}
        <div className={cn('flex items-start gap-3 px-2 py-0.5')}>
          {/* --- metadata --- */}
          <div className={'flex flex-row items-center gap-1 pt-0.5'}>
            <MessageTimestamp
              timestamp={msg.timestamp}
              className={'text-zinc-400/30'}
            />
            <MessageBadge
              badgeName={msg.badge.name}
              className={msg.badge.className}
            />
          </div>
          {/* --- content --- */}
          <div className="flex-1 min-w-0">
            <span
              className={cn(
                'text-xs font-mono break-all py-0.5 text-zinc-600',
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
