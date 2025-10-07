import type { StreamMessage } from '@/lib/client/stream-message'
import { Try } from '@asleepace/try'
import { type LogEntry } from './LogEntry'

export const logSourcese = ['system', 'client', 'message'] as const

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

export function getStylesFor({ content }: LogEntry) {
  const type =
    content.type === 'stream-event' ? (content.data.type === 'connected' ? 'client' : content.data.type) : 'message'

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
    badge: badgeForSource[type],
    textStyle: textColorForSource[type],
  }
}
