export const eventSources = ['stream', 'client', 'server'] as const
export const eventNames = ['connected', 'warning', 'error', 'closed', 'message'] as const

export type StreamEventSource = (typeof eventSources)[number]
export type StreamEventName = (typeof eventNames)[number]
export type StreamEventType = `${StreamEventSource}:${StreamEventName}`

export type JsonRecord = Record<string, any>

export interface StreamEventObject {
  eventType: StreamEventType
  streamId: string
  meta?: JsonRecord
  // content-types
  json?: JsonRecord
  text?: string
  html?: string
}

export interface EmitStreamEvent {
  emit(ev: string): void
}

/**
 *  Simple class which is used to create stream events.
 */
export class StreamEventEmitter {
  public streamId: string
  public eventTarget: EmitStreamEvent

  constructor(config: { streamId: string; eventTarget: EmitStreamEvent }) {
    this.streamId = config.streamId
    this.eventTarget = config.eventTarget
  }

  public emit(streamEvent: Omit<StreamEventObject, 'streamId'>) {
    const ev = this.createEvent(streamEvent)
    this.eventTarget.emit(ev.toObject())
  }

  public createEvent(streamEvent: Omit<StreamEventObject, 'streamId'>): StreamEvent {
    return new StreamEvent({ streamId: this.streamId, ...streamEvent })
  }

  public setEventTarget(eventTarget: EmitStreamEvent): this {
    this.eventTarget = eventTarget
    return
  }

  public setStreamId(streamId: string) {
    this.streamId = streamId
    return this
  }
}

/**
 *  ## StreamEvent
 *
 *  The stream event represents an application specific event which can be
 *  sent as part of the stream. This is a specific type of data which is received
 *  by the client and is used to represent specific actions like:
 *
 *    - a client connected to the stream
 *    - an error happened on the server for this stream
 *    - broadcast generic messages
 *
 *  This instance is a wrapper around the `StreamEventObject` type interface and provides
 *  several convenience methods for exporting and/or importing via this type.
 */
export class StreamEvent implements StreamEventObject {
  /**
   *  Creates a new stream event instance from an object or instance.
   */
  static from(streamEvent: StreamEvent | StreamEventObject): StreamEvent {
    if (streamEvent instanceof StreamEvent) {
      return new StreamEvent(streamEvent.toObject())
    } else {
      return new StreamEvent(streamEvent)
    }
  }

  /**
   *  Check if the given object is a Stream Event Object
   */
  static isKind(obj: unknown): obj is StreamEventObject {
    if (!obj || typeof obj === 'undefined') return false
    const casted = obj as StreamEventObject
    return Boolean(casted.eventType && casted.streamId)
  }

  // --- instance properties ---

  public readonly eventType: StreamEventType
  public readonly streamId: string
  public readonly meta: JsonRecord = {}
  public readonly json?: JsonRecord
  public readonly text?: string
  public readonly html?: string

  constructor(options: StreamEventObject) {
    this.eventType = options.eventType
    this.streamId = options.streamId
  }

  public get isHtml() {
    return Boolean(this.html)
  }

  public get isText() {
    return Boolean(this.text)
  }

  public get isJson() {
    return Boolean(this.json)
  }

  /**
   *  Returns a string which can be displayed in html.
   */
  public toHtmlString(): string {
    if (this.html) return this.html
    if (this.text) return `<span>${this.text}</span>`
    if (this.json) return `<span>${this.toJsonString()}</span>`
    return `<span>${this.eventType}</span>`
  }

  /**
   *  Exports the class instance to a stream event object.
   */
  public toObject(): StreamEventObject {
    return {
      eventType: this.eventType,
      streamId: this.streamId,
      meta: this.meta,
      text: this.text,
      json: this.json,
      html: this.html,
    }
  }

  /**
   * Export as object and JSON encode to string.
   */
  public toJsonString(): string {
    return JSON.stringify(this.toObject())
  }

  /**
   * Helper for debugging content to console.
   */
  public print(): this {
    console.log(`[stream-event] ${this.eventType}:`, this.toObject())
    return this
  }
}
