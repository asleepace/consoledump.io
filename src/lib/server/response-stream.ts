import { Timestamp } from './timestamp'

function dataEncode(data: any) {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`)
}

/**
 * A wrapper around a child stream which can detect when it has been closed,
 * can also take an optional cleanup method.
 */
export class ResponseStream {
  public readonly stream: ReadableStream
  public readonly timestamp = new Timestamp({ maxAge: 5 * 60 * 1000 })
  public controller?: ReadableStreamDefaultController<any>

  get tagName() {
    return `${this.config.parentId}-${this.config.id}`
  }

  get isClosed() {
    return !Boolean(this.controller)
  }

  constructor(
    public config: {
      readable: ReadableStream
      parentId: string
      id: number
    }
  ) {
    const TAG = `[stream-${config.parentId}:child-${config.id}]`
    const reader = config.readable.getReader()
    this.stream = new ReadableStream({
      start: (controller) => {
        this.controller = controller
        this.timestamp.update()
        controller.enqueue(dataEncode({ childId: this.tagName }))
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
      this.controller = undefined
    }
  }

  public isAlive() {
    try {
      if (!this.controller)
        throw new Error(`${this.tagName} controller is missing!`)
      this.controller?.enqueue(new TextEncoder().encode(': is-alive?'))
      return true
    } catch (e) {
      return false
    }
  }
}
