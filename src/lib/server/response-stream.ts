import { Timestamp } from './timestamp'

function dataEncode(data: any) {
  return new TextEncoder().encode(data)
}

/**
 * A wrapper around a child stream which can detect when it has been closed,
 * can also take an optional cleanup method.
 */
export class ResponseStream {
  public readonly stream: ReadableStream
  public readonly timestamp: Timestamp
  public controller?: ReadableStreamDefaultController<any>
  public encoder = new TextEncoder()
  public interval?: NodeJS.Timeout

  get tagName() {
    return `${this.config.parentId}-${this.config.id}`
  }

  get isClosed() {
    return !Boolean(this.controller)
  }

  constructor(
    public config: {
      maxAge: number
      keepAliveInterval: number
      readable: ReadableStream
      parentId: string
      id: number
    }
  ) {
    this.timestamp = new Timestamp({ maxAge: config.maxAge })
    const TAG = `[stream:${config.parentId}-${config.id}]`
    const reader = config.readable.getReader()
    this.stream = new ReadableStream({
      start: (controller) => {
        this.controller = controller
        this.timestamp.update()
        // NOTE: the first message (id=0) will be the childId which consists
        // of both the streamId and child number. This is then used to cleanup
        // from the client or finalization registry.
        controller.enqueue(dataEncode({ childId: this.tagName }))
        this.startKeepAlive()
      },
      pull: async (controller) => {
        const chunk = await reader.read()
        controller.enqueue(chunk.value)
        this.timestamp.update()
      },
      cancel: (reason) => {
        console.warn(TAG, 'cancelling...', reason)
        this.close()
      },
    })
  }

  public startKeepAlive() {
    if (this.interval) return
    this.interval = setInterval(() => {
      if (!this.keepAlive()) {
        this.close()
      }
    }, this.config.keepAliveInterval)
  }

  public toResponse(headersInit: HeadersInit = {}) {
    return new Response(this.stream, {
      headers: {
        ...headersInit,
        'content-type': 'text/event-stream',
        'transfer-encoding': 'chunked',
        'x-accel-buffering': 'no',
        'x-stream-id': `${this.config.parentId}-${this.config.id}`,
      },
    })
  }

  public close() {
    try {
      if (this.isClosed) return
      this.controller?.close()
    } catch (e) {
      console.warn(this.tagName, 'error closing:', e)
    } finally {
      clearInterval(this.interval)
      this.controller = undefined
    }
  }

  public keepAlive(): boolean {
    try {
      if (!this.controller) return false
      if (this.timestamp.isExpired) return false
      this.controller?.enqueue(this.encoder.encode(': keep-alive'))
      return true
    } catch (e) {
      return false
    }
  }
}
