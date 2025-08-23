class StreamMessage {
  public readonly json?: any
  public readonly text?: string

  constructor(data: any) {
    try {
      this.text = String(data)
      this.json = JSON.parse(this.text)
      this.text = undefined
      console.log('[stream-message] json:', this.json)
    } catch (e) {
      console.warn('[stream-message] decoding issue:', e, data)
    }
  }

  public format(): string {
    if (this.json) return JSON.stringify(this.json, null, 2)
    return this.text ?? '<empty>'
  }
}

type StreamMessageHandler = (message: StreamMessage) => Promise<void> | void

/**
 * Creates a new stream client which listens to remove events.
 */
export class StreamClient extends EventTarget {
  static async new() {
    const resp = await fetch('/api/see', { method: 'HEAD' })
    const streamId = resp.headers.get('x-stream-id')
    if (!streamId) throw new Error('Invalid stream id header:' + streamId)
    return new StreamClient(streamId)
  }

  public readonly messages: StreamMessage[] = []
  public source: EventSource
  private state = {
    isConnected: false,
  }

  public onMessage: StreamMessageHandler = (message: StreamMessage) => {
    console.log('[stream-client] message:', message)
  }

  constructor(public readonly id: string) {
    super()

    const source = new EventSource(`/api/sse?id=${id}`, {
      withCredentials: true,
    })

    source.addEventListener('open', () => {
      console.log('[stream-client] connected to stream:', { id })
      this.state.isConnected = true
    })

    source.addEventListener('error', () => {
      console.log('[stream-client] disconnected from stream:', { id })
      this.state.isConnected = false
      source.close()
      window.location.pathname = '/'
    })

    source.addEventListener('message', (ev) => {
      const message = new StreamMessage(ev.data)
      this.messages.push(message)
      this.onMessage(message)
    })

    this.source = source
  }

  public on(handler: StreamMessageHandler) {
    this.onMessage = handler
  }
}
