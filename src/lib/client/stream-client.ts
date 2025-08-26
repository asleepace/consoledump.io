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
    childId: '',
  }

  public onMessage: StreamMessageHandler = (message: StreamMessage) => {
    if (message.type === 'message') console.log(message)
  }

  public async cleanup() {
    return fetch(`/api/sse?id=${this.state.childId}`, { method: 'DELETE' })
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
      this.fetch(...args)
        .then((res) => res.value?.status)
        .catch(console.warn)
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
      this.onMessage(
        StreamMessage.create({
          type: 'client',
          html: `<p class="text-red-400">client error, disconnecting...</p>`,
        })
      )
      this.onMessage(
        StreamMessage.create({
          type: 'client',
          html: `<a href="/" class="underline text-white">click here to start a new session!</a>`,
        })
      )
    })

    source.addEventListener('message', (ev) => {
      const message = new StreamMessage(ev.data)
      if (
        !this.state.childId &&
        'childId' in message.json &&
        typeof message.json.childId === 'string'
      ) {
        this.state.childId = message.json.childId
      } else {
        this.messages.push(message)
        this.onMessage(message)
      }
    })

    window.addEventListener('beforeunload', () => {
      this.cleanup().catch((e) => {
        console.warn('[stream-client] error cleaning up:', e)
      })
    })

    this.source = source
  }

  public on(handler: StreamMessageHandler) {
    this.onMessage = handler
  }
}
