import { Try, type TryResult } from '@asleepace/try'

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

export function safeEncodeJson(data: object) {
  return Try.catch(() => JSON.stringify(data, null, 2) as string)
}

export function safeDecodeJson<T>(json: string) {
  return Try.catch(() => JSON.parse(json) as T)
}

export function createJsonDataFile(props: { sessionId: string; logs: any[] }) {
  return {
    fileName: `dump-${props.sessionId}.json`,
    sessionId: props.sessionId,
    timestamp: new Date(),
    data: props.logs,
  }
}

export function downloadJsonFile(fileData: { fileName: string, data: object | object[] }) {
  const data = safeEncodeJson(fileData)
  if (!data.ok) return console.warn('Failed to encode json data:', data.error)
  const name = fileData.fileName
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
    safeEncodeJson,
    formatTimestamp,
    createJsonDataFile,
    downloadJsonFile,
  }
}
