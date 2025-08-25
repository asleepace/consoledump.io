import { Try } from '@asleepace/try'
import { StreamMessage } from './stream-message'
export { StreamMessage }

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

  public async fetch(...args: any[]) {
    return Try.catch(async () => {
      return fetch(`/${this.id}`, {
        method: 'POST',
        body: JSON.stringify(args),
      })
    })
  }

  constructor(public readonly id: string) {
    super()

    // @ts-ignore
    console.dump = (...args: any[]) => {
      this.fetch(...args).catch(console.warn)
    }

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
