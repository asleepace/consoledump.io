export const defaultLogTypes = ['client', 'system', 'message', 'error', 'closed'] as const
export const defaultLogContentTypes = ['html', 'text', 'json', 'code'] as const

export type LogType = 'client' | 'system' | 'message' | 'error' | 'closed'

export type LogContentType = 'html' | 'text' | 'json' | 'code'

/**
 * ## Log Entry
 *
 * Shape of the log entry type.
 *
 * @note the `text` property should always be present.
 *
 * ```ts
 * const logEntry = {
 *    // meta properties...
 *    id: crypto.randomUUID(),
 *    createAt: new Date(),
 *    type: 'message',
 *    // content properties...
 *    contentType: 'text',
 *    text: 'Hello, world!',
 *    json: undefined,
 *    html: undefined,
 * }
 */
export type LogEntry<T = any> = {
  id: string
  createdAt: Date
  type: LogType
  contentType: LogContentType
  html: string | undefined
  json: T | undefined
  text: string
}
