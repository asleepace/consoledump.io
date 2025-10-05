import { Try } from '@asleepace/try'
import type { LogEntry } from './LogEntryItem'

/**
 * Format a date to a HH:MM:SS timestamp.
 * @param date
 */
export function formatTimestamp(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0')
  const mins = date.getMinutes().toString().padStart(2, '0')
  const secs = date.getSeconds().toString().padStart(2, '0')
  return [hours, mins, secs].join(':')
}

export interface JsonFileData {
  fileName: string
  sessionId: string
  timestamp: Date
  data: LogEntry[]
}

export function encodeJsonSafe(data: object) {
  return Try.catch(() => JSON.stringify(data, null, 2))
}

export function createJsonDataFile(props: { sessionId: string; logs: LogEntry[] }): JsonFileData {
  return {
    fileName: `dump-${props.sessionId}.json`,
    sessionId: props.sessionId,
    timestamp: new Date(),
    data: props.logs,
  }
}

export function downloadJsonFile(fileData: JsonFileData) {
  const data = encodeJsonSafe(fileData)
  if (!data.ok) return console.warn('Failed to encode json data:', data.error)
  const name = fileData.fileName || `dump-${fileData.sessionId}.json`
  const blob = new Blob([data.value], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.download = name
  a.href = url
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Exports an object misc. operations and helpers.
 * @returns
 */
export function useUtils() {
  return {
    encodeJsonSafe,
    formatTimestamp,
    createJsonDataFile,
    downloadJsonFile,
  }
}
