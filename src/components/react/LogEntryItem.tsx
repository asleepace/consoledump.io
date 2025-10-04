import { cn } from '@/lib/utils'

export interface LogEntry {
  timestamp: string
  type: 'connected' | 'system' | 'message' | 'error'
  content: string
  id: string
  isCode?: boolean
}

export function LogEntryItem(props: LogEntry & { className?: string }) {
  return (
    <div className={cn('w-full', props.className)}>
      <div key={log.id} className={`group ${theme.hover} rounded border ${theme.border} transition-all`}>
        <div className="flex items-start gap-3 px-3 py-2">
          <span className={`${theme.textMuted} text-xs shrink-0 w-16`}>{log.timestamp}</span>
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${getTypeBadge(log.type)}`}>
            {log.type}
          </span>
          <div className="flex-1 min-w-0">
            {log.isCode ? (
              <div className="space-y-1">
                <button onClick={() => toggleExpand(log.id)} className="flex items-center gap-1.5 w-full text-left">
                  {expandedLogs.has(log.id) ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                  <span className={`${getTypeColor(log.type)} text-xs ${expandedLogs.has(log.id) ? '' : 'truncate'}`}>
                    {expandedLogs.has(log.id)
                      ? log.content
                      : log.content.slice(0, 80) + (log.content.length > 80 ? '...' : '')}
                  </span>
                </button>
                {expandedLogs.has(log.id) && (
                  <pre className={`${theme.code} p-2 rounded text-xs overflow-x-auto`}>
                    <code>{log.content}</code>
                  </pre>
                )}
              </div>
            ) : (
              <span className={`${getTypeColor(log.type)} text-xs break-all`}>{log.content}</span>
            )}
          </div>
          <button
            onClick={() => copyToClipboard(log.content, log.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-1 hover:bg-blue-500/20 rounded"
          >
            {copiedId === log.id ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className={`w-3.5 h-3.5 ${theme.textMuted} group-hover:text-blue-500`} />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
