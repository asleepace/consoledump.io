import type { StreamMessage } from '@/lib/client/stream-message'
import { cn } from '@/lib/utils'
import { Try } from '@asleepace/try'

export const logSourcese = ['system', 'client', 'message'] as const

/** represents a source and optional sub-type  */
export type LogSource = (typeof logSourcese)[number]
export type LogType = LogSource | `${LogSource}:${string}`

/** represents rich content available in text. */
export interface LogEntryContent<T = any> {
  code?: string
  html?: string
  json?: T
}

/**
 * Shared interface for log entries.
 *
 * @note please use `makeLogEntry(text)` to create.
 */
export interface LogEntry<T = any> {
  id: string
  createdAt: Date
  type: LogType
  text: string
  content: LogEntryContent<T>
}

// --- helpers ---

export function makeRandomId(size = 16): string {
  return crypto.randomUUID().slice(size).replaceAll('-', '')
}

export function decodeJsonSafe<T>(data: string): T | undefined {
  return Try.catch(() => JSON.parse(data.trim()))?.value as T | undefined
}

export function hasTypeProperty(obj: unknown): obj is { type: string } {
  if (!obj || typeof obj !== 'object') return false
  const maybeType = (obj as { type: string })?.type
  return Boolean(maybeType && typeof maybeType === 'string')
}

export function isHtmlMessage(maybeHtml: string) {
  const trim = maybeHtml.trim()
  return trim.startsWith('<') && trim.endsWith('>')
}

/** @TODO implement. */
export function isCodeMessage(maybeHtmlWithCode: string | undefined): boolean {
  if (!maybeHtmlWithCode) return false
  return maybeHtmlWithCode.includes('<code>') && maybeHtmlWithCode.includes('</code>')
}

/** returns the first valid code/pre block found in the string. */
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

export function parseLogType(logType: LogType | string): { source: LogSource; subtype: string | undefined } {
  const [source = 'message', subtype] = logType.split(':')

  if (source === 'connected') {
    return { source: 'client', subtype: 'connected' }
  }

  return { source: source as LogSource, subtype }
}

export function getStylesFor(logEntry: LogEntry) {
  const type = parseLogType(logEntry.type)

  const badgeForSource = {
    system: 'badge-emerald',
    client: 'badge-indigo',
    message: 'badge-zinc',
  }

  const textColorForSource = {
    system: 'text-emerald-500',
    client: 'text-indigo-500',
    message: 'text-zinc-500',
  }

  return {
    badge: badgeForSource[type.source],
    textStyle: textColorForSource[type.source],
  }
}

// --- log entry ---

function getTypeFromStreamMessage(msg: StreamMessage): LogType {
  if (msg.type === 'connected') return `client:connected`
  if (msg.type === 'closed') return `system:closed`
  if (msg.type === 'error') return `system:error`
  if (msg.type === 'system') return `system`
  return 'message'
}

export function parseStreamMessage(streamMessage: StreamMessage): LogEntry {
  return makeLogEntry(streamMessage.format(), {
    type: getTypeFromStreamMessage(streamMessage),
  })
}

/**
 * Create a logEntry object from the given text.
 */
export function makeLogEntry(text: string, options: Partial<LogEntry> = {}): LogEntry {
  const json = decodeJsonSafe<{ data?: any }>(text)
  const html = isHtmlMessage(text) ? text : undefined
  const code = getCodeBlock(html)
  const type: LogType = options?.type || 'message'

  return {
    id: makeRandomId(),
    createdAt: new Date(),
    text,
    type,
    ...options,
    content: {
      json,
      html,
      code,
      ...(options.content ?? {}),
    },
  }
}
