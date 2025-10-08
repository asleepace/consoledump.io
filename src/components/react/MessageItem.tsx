import { useAppContext } from './AppContext'
import { cn } from '@/lib/utils'
import { Check, ChevronDown, ChevronRight, Copy } from 'lucide-react'
import { getTypeBadge } from '@/components/react/useTheme'
import { memo, useMemo } from 'react'
import { formatTimestamp } from './useUtils'

/** Timestamp */
const LogTimestamp = ({ className, createdAt = new Date() }: { className?: string; createdAt?: Date }) => {
  return <span className={cn('text-xs text-gray-400/40 font-mono shrink-0 w-16')}>{formatTimestamp(createdAt)}</span>
}

/** Type Badge */
const LogBadge = (props: { className?: string; badgeName: string }) => {
  return (
    <span className={cn('px-1.5 py-0.5 rounded text-xs font-mono font-medium shrink-0', props.className)}>
      {props.badgeName}
    </span>
  )
}

/** Copy to Clipboard Button */
const BtnCopyToClipboard = (props: { onClick: () => void; isCopied: boolean; className?: string }) => (
  <button
    onClick={props.onClick}
    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-1 hover:bg-blue-500/20 rounded"
  >
    {props.isCopied ? (
      <Check className="w-3.5 h-3.5 text-emerald-500" />
    ) : (
      <Copy className={cn('w-3.5 h-3.5 group-hover:text-blue-500', props.className)} />
    )}
  </button>
)

/** Text Content Preview */
const getContentPreview = ({ content, maxSize = 80 }: { maxSize?: number; content: string }) => {
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
      <button onClick={onClick} className="flex text-pink-500 items-center gap-1.5 w-full text-left">
        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <span className={cn('text-xs', textColor, !isExpanded && 'truncate')}>{contentPreview}</span>
      </button>
      {isExpanded && (
        <div className="flex shrink">
          <pre className={cn('p-2 rounded text-xs overflow-x-auto flex text-green-500', className)}>
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
const ContentText = (props: { html: string; isExpanded?: boolean; className?: string }) => (
  <span
    className={cn('text-xs font-mono break-all py-0.5', props.className)}
    dangerouslySetInnerHTML={{ __html: props.html }}
  />
)

export function isStreamJson(json: unknown): json is { type: 'json' | 'html' | 'text'; text?: string; html?: string } {
  if (!json || typeof json !== 'object') return false
  const data = json as Record<string, string>
  return 'type' in data && ('html' in data || 'text' in data)
}

export function getCodeBlock(htmlString: string | undefined): string | undefined {
  if (!htmlString) return undefined
  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlString, 'text/html')
  const codeElements = doc.querySelectorAll('code, pre')
  for (const codeBlock of codeElements) {
    if (!codeBlock?.textContent) continue
    return codeBlock.textContent
  }
}

export type EventType = 'connected' | 'system' | 'client' | 'message' | 'error'

export function getStylesFor(eventType: EventType) {
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
    message: 'text-zinc-500',
    error: 'text-red-500',
  }

  return {
    badge: badgeForSource[eventType],
    textStyle: textColorForSource[eventType],
  }
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
  const { theme, expandedLogs, copiedId, toggleExpand, copyToClipboard } = useAppContext()

  const isCopied = copiedId === message.lastEventId
  const isExpanded = expandedLogs.has(message.lastEventId)

  const style = getStylesFor('message')
  const badgeName = 'message'

  const htmlContent = `<span>${message.data}</span>`

  return (
    <div className={cn('w-full font-mono', className)}>
      <div
        key={message.lastEventId}
        className={cn(
          'group border-b border-t-transparent hover:border-t-gray-400/10 box-content border-t border-b-gray-400/10',
          theme.hover
        )}
      >
        {/* --- log entry --- */}
        <div className={cn('flex items-start gap-3 px-2 py-0.5', isExpanded ? 'pb-2' : '')}>
          {/* --- metadata --- */}
          <div className={cn('flex flex-row items-center gap-1 pt-0.5')}>
            <LogTimestamp createdAt={new Date(message.timeStamp)} className={theme.textMuted} />
            <LogBadge badgeName={badgeName} className={style.badge} />
          </div>
          {/* --- content --- */}
          <div className="flex-1 min-w-0">
            <ContentText html={htmlContent} className={style.textStyle} />
          </div>
          {/* --- actions --- */}
          <BtnCopyToClipboard
            onClick={() => copyToClipboard({ content: message.data, id: message.lastEventId })}
            isCopied={isCopied}
            className={cn(isCopied && theme.textMuted)}
          />
        </div>
      </div>
    </div>
  )
})
