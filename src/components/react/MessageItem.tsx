import { cn } from '@/lib/utils'
import { memo, useCallback, useState } from 'react'
import { copyToClipboard } from '@/lib/client/clipboard'
import { safe } from '@/lib/shared/safe-utils'
import { MessageTimestamp } from '@/components/react/MessageTimestamp'
import { MessageBadge } from './MessageBadge'
import { BtnCopyToClipboard } from './Buttons'
import { createPatternMatcher } from '@/lib/client/parser'

interface Props {
  message: MessageEvent<string>
  className?: string
}

const matcher = createPatternMatcher([
  { match: /(error:)/gi, badgeName: 'error', className: 'text-red-500' },
  { match: /(warn:)/gi, badgeName: 'warn', className: 'text-yellow-400' },
  { match: /(info:)/gi, badgeName: 'info', className: 'text-blue-400' },
  { match: /(debug:)/gi, badgeName: 'debug', className: 'text-orange-400' },
  { match: /(log:)/gi, badgeName: 'log', className: 'text-zinc-400' },
  { match: (msg) => msg.badge.name === 'client', className: 'text-indigo-400' },
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
  const [isExpanded, setIsExpanded] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  const msg = matcher.parse(message)

  console.log({ msg })

  const onCopied = useCallback(() => {
    setIsCopied(true)
    copyToClipboard(String(message.data))
    setTimeout(() => setIsCopied(false), 1_000)
  }, [])

  return (
    <div
      onClick={() => setIsExpanded(true)}
      className={cn('w-full font-mono', className)}
    >
      <div
        className={
          'group border-b border-t-transparent hover:border-t-gray-400/10 box-content border-t border-b-gray-400/10 hover:bg-gray-800/50'
        }
      >
        {/* --- message content --- */}
        <div
          className={cn(
            'flex items-start gap-3 px-2 py-0.5',
            isExpanded ? 'pb-2' : ''
          )}
        >
          {/* --- metadata --- */}
          <div className={'flex flex-row items-center gap-1 pt-0.5'}>
            <MessageTimestamp
              timestamp={new Date(message.timeStamp)}
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
                'text-xs font-mono break-all py-0.5',
                msg.getClassName()
              )}
              dangerouslySetInnerHTML={{ __html: msg.html }}
            />
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
