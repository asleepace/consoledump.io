import { useAppContext } from './AppContext'
import { cn } from '@/lib/utils'
import { Check, ChevronDown, ChevronRight, Copy } from 'lucide-react'
import { getTypeBadge, getTypeColor } from '@/hooks/useTheme'
import { memo } from 'react'
import type { StreamMessage } from '@/lib/client/stream-message'

export type LogFrom = 'client' | 'system' | 'message' | 'error'

export interface LogEntry {
  createdAt: Date
  type: StreamMessage['type']
  contentType: 'html' | 'text' | 'json' | 'code'
  data: string
  id: string
}

export type LogEntryProps = LogEntry & {
  className?: string
}

export function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

/** Timestamp */
const LogTimestamp = ({ className, createdAt = new Date() }: { className?: string; createdAt?: Date }) => {
  return <span className={cn('text-xs text-gray-400/40 font-mono shrink-0 w-16')}>{formatTime(createdAt)}</span>
}

/** Type Badge */
const LogBadge = (props: { type: LogEntry['type'] }) => (
  <span className={cn('px-1.5 py-0.5 rounded text-xs font-mono font-medium shrink-0', getTypeBadge(props.type))}>
    {props.type}
  </span>
)

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
  log,
  isExpanded,
  onClick,
  className,
}: {
  log: LogEntry
  isExpanded: boolean
  className?: string
  onClick: () => void
}) => {
  const color = getTypeColor(log.type)
  const contentPreview = getContentPreview({ content: log.data, maxSize: 80 })

  return (
    <div className="space-y-1">
      <button onClick={onClick} className="flex text-pink-500 items-center gap-1.5 w-full text-left">
        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <span className={cn('text-xs', color, !isExpanded && 'truncate')}>{contentPreview}</span>
      </button>
      {isExpanded && (
        <div className="flex shrink">
          <pre className={cn('p-2 rounded text-xs overflow-x-auto flex text-green-500', className)}>
            <code>{log.data}</code>
          </pre>
        </div>
      )}
    </div>
  )
}

/**
 * Displayed content for text logs.
 */
const ContentText = ({ log, className }: { log: LogEntry; isExpanded?: boolean; className?: string }) => {
  return (
    <span
      className={cn('text-xs font-mono break-all py-0.5', getTypeColor(log.type), className)}
      dangerouslySetInnerHTML={{ __html: log.data }}
    />
  )
}

/**
 * ## LogEntryItem
 *
 * This is the container for console messages which appear in the browser as part of a list,
 * and provide support for actions like expanding, copying, etc.
 */
export const LogEntryItem = memo(({ className, ...log }: LogEntryProps) => {
  const { theme, expandedLogs, copiedId, toggleExpand, copyToClipboard } = useAppContext()

  const isCopied = copiedId === log.id
  const isExpanded = expandedLogs.has(log.id)

  return (
    <div className={cn('w-full font-mono', className)}>
      <div
        key={log.id}
        className={cn(
          'group border-b border-t-transparent hover:border-t-gray-400/10 box-content border-t border-b-gray-400/10',
          theme.hover
        )}
      >
        {/* --- log entry --- */}
        <div className={cn('flex items-start gap-3 px-2 py-0.5', isExpanded ? 'pb-2' : '')}>
          {/* --- metadata --- */}
          <div className={cn('flex flex-row items-center gap-1 pt-0.5')}>
            <LogTimestamp createdAt={log.createdAt} className={theme.textMuted} />
            <LogBadge type={log.type} />
          </div>
          {/* --- content --- */}
          <div className="flex-1 min-w-0">
            {log.contentType === 'code' ? (
              <ContentCode
                log={log}
                className={theme.code}
                isExpanded={isExpanded}
                onClick={() => {
                  console.log('clicked')
                  toggleExpand(log.id)
                }}
              />
            ) : (
              <ContentText log={log} />
            )}
          </div>
          {/* --- actions --- */}
          <BtnCopyToClipboard
            onClick={() => copyToClipboard({ content: log.data, id: log.id })}
            isCopied={isCopied}
            className={cn(isCopied && theme.textMuted)}
          />
        </div>
      </div>
    </div>
  )
})
