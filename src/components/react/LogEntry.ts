/** array of available stream event types. */
const streamEventTypes = ['system', 'client', 'message', 'connected', 'error'] as const

/** special types given to various application events. */
export type StreamEventType = 'system' | 'client' | 'message' | 'connected' | 'error'

/** represents a specific event from the application. */
export interface StreamEventData {
  type: StreamEventType
  html?: string | undefined
  text?: string | undefined
  json?: any
  streamId?: string
}

/** various types of supported data. */

export type StreamDataType = 'stream-event' | 'json-array' | 'json-object' | 'basic-string'

export type ContentTypeEvent = {
  type: 'stream-event'
  data: StreamEventData
}

export type ContentTypeJsonArray = {
  type: 'json-array'
  data: Array<any>
}

export type ContentTypeJsonObject = {
  type: 'json-object'
  data: Record<string, any>
}

export type ContentTypeBasicString = {
  type: 'basic-string'
  data: string
}

export type StreamContent = ContentTypeEvent | ContentTypeJsonArray | ContentTypeJsonObject | ContentTypeBasicString

/** log entry which contains metadata and various types of receivable content. */
export type LogEntry = {
  createdAt: Date
  id: string
  content: StreamContent
}

export function hasStreamId(o: unknown): o is { streamId: string } {
  return !!(o as any)?.streamId
}

function isStreamEvent(obj: unknown): obj is StreamEventData {
  if (!obj || typeof obj !== 'object') return false
  const se = obj as StreamEventData
  const hasType = streamEventTypes.some((type) => se.type === type)
  return hasType && (se.html || se.json || se.text || se.streamId)
}

function makeTuple(content: StreamContent): StreamContent {
  return content
}

function decodeStreamEvent(ev: MessageEvent): StreamContent {
  try {
    const data = JSON.parse(ev.data)
    if (Array.isArray(data)) {
      return makeTuple({ type: 'json-array', data })
    }
    if (isStreamEvent(data)) {
      return makeTuple({ type: 'stream-event', data })
    }
    return makeTuple({ type: 'json-object', data })
  } catch (e) {
    return makeTuple({ type: 'basic-string', data: String(ev.data) })
  }
}

/**
 * Helper function which is used to log incoming data to console normally.
 */
function forwardLogToConsole(content: StreamContent) {
  if (content.type === 'json-array') {
    return console.log(...content.data)
  }

  if (content.type === 'stream-event') {
    const text = content.data.html ?? content.data.json ?? content.data.text
    const tag = `[${content.data.type}]`
    if (content.data.type === 'error') {
      console.error(tag, content)
    }
    return console.log(tag, content)
  }

  return console.log(content.data)
}

/**
 * Parse message event as log data.
 */
export function makeLog(ev: MessageEvent<string>): LogEntry {
  const content = decodeStreamEvent(ev)

  /** @note forward log to console */
  forwardLogToConsole(content)

  return {
    createdAt: new Date(),
    id: ev.lastEventId,
    content,
  }
}
