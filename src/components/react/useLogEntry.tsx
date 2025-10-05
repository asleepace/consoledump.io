import { useCallback } from 'react'
import { defaultLogTypes, type LogEntry } from './types'
import { Try } from '@asleepace/try'

export function makeRandomId(size = 16): string {
  return crypto.randomUUID().slice(size).replaceAll('-', '')
}

export function decodeJsonSafe<T>(data: string): T | undefined {
  return Try.catch(() => JSON.parse(data.trim()))?.value as T | undefined
}

export const getMessageType = (data: unknown) => {
  return defaultLogTypes.find((dataType) => dataType === (data as any).type)
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
export function isCodeMessage(maybeCode: string): boolean {
  return false
}

export function createLogEntry<T>({ text = '', ...props }: Partial<LogEntry> = {}): LogEntry {
  const json = decodeJsonSafe<{ data?: any }>(text)
  const type = getMessageType(json?.data) ?? 'message'
  const code = undefined
  const html = isHtmlMessage(text) ? text : undefined

  const getContentType = (): LogEntry['contentType'] => {
    if (json) return 'json'
    if (html) return 'html'
    if (code) return 'code'
    return 'text'
  }

  return {
    id: makeRandomId(),
    createdAt: new Date(),
    type: type,
    contentType: getContentType(),
    text,
    json: undefined,
    html,
  }
}

/**
 * This hook attaches helpful methods to a logEntry.
 * @param logEntry
 */
export function useLogEntry(logEntry: LogEntry) {
  return {
    ...logEntry,
  }
}
