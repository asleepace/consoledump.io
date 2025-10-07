import { useAppContext } from './AppContext'
import { cn } from '@/lib/utils'
import { Check, ChevronDown, ChevronRight, Copy } from 'lucide-react'
import { getTypeBadge } from '@/components/react/useTheme'
import { memo, useMemo } from 'react'
import { formatTimestamp } from './useUtils'

import { getStylesFor } from './useLogEntry'
import { type LogEntry } from './LogEntry'

export type LogEntryProps = LogEntry & {
  className?: string
}

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

  const style = getStylesFor(log)
  const badgeName = log.content.type === 'stream-event' ? log.content.data.type : 'message'

  function getDisplayedHtml() {
    const { content } = log

    console.log('[LogEntryItem] content:', content)


    if (content.type === 'stream-event') {

      if (content.data.type === 'connected') {
        const streamId = content.data.streamId
        return `<span class="text-blue-500">connected to stream <a class="text-orange-500" href="/${streamId}">${streamId}</span>`
      }

      return content.data.html ?? content.data.json ?? content.data.text
    }

    if (content.type === 'json-object') {
      return String(content.data)
    }

    if (content.type === 'json-array') {
      return content.data.map((item) => JSON.stringify(item))
    }

    return content.data
  }

  const htmlContent = getDisplayedHtml()
  const code = undefined

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
            <LogBadge badgeName={badgeName} className={style.badge} />
          </div>
          {/* --- content --- */}
          <div className="flex-1 min-w-0">
            {code ? (
              <ContentCode
                content={code}
                textColor={style.textStyle}
                className={theme.code}
                isExpanded={isExpanded}
                onClick={() => {
                  console.log('clicked')
                  toggleExpand(log.id)
                }}
              />
            ) : (
              <ContentText html={htmlContent} className={style.textStyle} />
            )}
          </div>
          {/* --- actions --- */}
          <BtnCopyToClipboard
            onClick={() => copyToClipboard({ content: htmlContent, id: log.id })}
            isCopied={isCopied}
            className={cn(isCopied && theme.textMuted)}
          />
        </div>
      </div>
    </div>
  )
})
