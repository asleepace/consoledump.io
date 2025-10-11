import { cn } from '@/lib/utils'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { memo, useCallback, useState } from 'react'
import { textParser } from '@/lib/client/parser'
import { copyToClipboard } from '@/lib/client/clipboard'
import { safe } from '@/lib/shared/safe-utils'
import { MessageTimestamp } from '@/components/react/MessageTimestamp'
import { MessageBadge } from './MessageBadge'
import { BtnCopyToClipboard } from './Buttons'

/** Text Content Preview */
const getContentPreview = ({
  content,
  maxSize = 80,
}: {
  maxSize?: number
  content: string
}) => {
  const isUnderMaxSize = content.length > maxSize
  const preview = content.slice(0, maxSize)
  return isUnderMaxSize ? preview : `${preview}...`
}

/** Displayed Code Content */
const ContentCode = ({
  content,
  textColor,
  isExpanded,
  onClick,
  className,
}: {
  textColor?: string
  content: string
  isExpanded: boolean
  className?: string
  onClick: () => void
}) => {
  const contentPreview = getContentPreview({ content, maxSize: 80 })

  return (
    <div className="space-y-1">
      <button
        onClick={onClick}
        className="flex text-pink-500 items-center gap-1.5 w-full text-left"
      >
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
        <span className={cn('text-xs', textColor, !isExpanded && 'truncate')}>
          {contentPreview}
        </span>
      </button>
      {isExpanded && (
        <div className="flex shrink">
          <pre
            className={cn(
              'p-2 rounded text-xs overflow-x-auto flex text-green-500',
              className
            )}
          >
            <code>{content}</code>
          </pre>
        </div>
      )}
    </div>
  )
}

/**
 * Displayed content for text logs.
 */
const ContentText = (props: {
  html: string
  isExpanded?: boolean
  className?: string
}) => (
  <span
    className={cn('text-xs font-mono break-all py-0.5', props.className)}
    dangerouslySetInnerHTML={{ __html: props.html }}
  />
)

export function isStreamJson(
  json: unknown
): json is { type: 'json' | 'html' | 'text'; text?: string; html?: string } {
  if (!json || typeof json !== 'object') return false
  const data = json as Record<string, string>
  return 'type' in data && ('html' in data || 'text' in data)
}

export function getCodeBlock(
  htmlString: string | undefined
): string | undefined {
  if (!htmlString) return undefined
  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlString, 'text/html')
  const codeElements = doc.querySelectorAll('code, pre')
  for (const codeBlock of codeElements) {
    if (!codeBlock?.textContent) continue
    return codeBlock.textContent
  }
}

export function getStylesFor(eventType: string) {
  const badgeForSource = {
    connected: 'badge-green',
    system: 'badge-emerald',
    client: 'badge-indigo',
    message: 'badge-zinc',
    error: 'badge-red',
  }
  const textColorForSource = {
    connected: 'text-green-500',
    system: 'text-emerald-500',
    client: 'text-indigo-500',
    message: 'text-zinc-600',
    error: 'text-red-500',
  }
  type SourceTypes = keyof typeof badgeForSource
  return {
    badge: badgeForSource[eventType as SourceTypes] ?? badgeForSource.message,
    textStyle: textColorForSource[eventType as SourceTypes],
  }
}

interface ClientConnected {
  streamId: string
  clientId: string
}

interface SystemClientConnected {
  eventName: 'client:connected'
  eventData: {
    clientId: string
  }
}
interface SystemClientClosed {
  eventName: 'client:closed'
  eventData: {
    clientId: string
  }
}

type SystemEvent = SystemClientConnected | SystemClientClosed

function getMessageForEvent(ev: MessageEvent) {
  if (ev.type === 'message') {
    const json = safe.decodeJson(ev.data)

    if (json && Array.isArray(json)) {
      return json
        .map((item) => {
          if (item && typeof item === 'object') return JSON.stringify(item)
          return String(item)
        })
        .join(' ')
    }

    return ev.data
  }

  if (ev.type === 'client') {
    const clientEvent = ev.data as ClientConnected
    const currentHref = safe.getUrlWithId(clientEvent.streamId)
    return `connected (id: <a href="#${clientEvent.clientId}" class="text-orange-400 hover:underline">#${clientEvent.clientId}</a>) to stream <a class="text-orange-400 hover:underline" href="${currentHref}">${currentHref}</a>`
  }

  if (ev.type === 'system') {
    const systemEvent = safe.decodeJson<SystemEvent>(ev.data)
    if (!systemEvent) return ev.data
    if (systemEvent.eventName === 'client:connected') {
      const clientId = systemEvent.eventData.clientId
      return `client (<a class="text-orange-400" href="#${clientId}">#${clientId}</a>) connected to stream!`
    }
  }

  return ev.data
}

interface Props {
  message: MessageEvent<string>
  className?: string
}

/**
 * ## MessageItem
 *
 * This is the container for console messages which appear in the browser as part of a list,
 * and provide support for actions like expanding, copying, etc.
 */
export const MessageItem = memo(({ className, message }: Props) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  const msg = getMessageForEvent(message)
  const content = textParser.parseText(msg)
  const htmlContent = content.html
  const badgeName = content.badgeName
  const style = getStylesFor(badgeName)

  console.log({ htmlContent })

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
        className={cn(
          'group border-b border-t-transparent hover:border-t-gray-400/10 box-content border-t border-b-gray-400/10',
          'hover:bg-gray-800/50'
        )}
      >
        {/* --- message content --- */}
        <div
          className={cn(
            'flex items-start gap-3 px-2 py-0.5',
            isExpanded ? 'pb-2' : ''
          )}
        >
          {/* --- metadata --- */}
          <div className={cn('flex flex-row items-center gap-1 pt-0.5')}>
            <MessageTimestamp
              timestamp={new Date(message.timeStamp)}
              className={'text-zinc-400'}
            />
            <MessageBadge badgeName={badgeName} className={style.badge} />
          </div>
          {/* --- content --- */}
          <div className="flex-1 min-w-0">
            <ContentText html={htmlContent} className={style.textStyle} />
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
