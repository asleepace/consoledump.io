type StreamID = string
type ClientID = number
type PipeToStream = (message: Uint8Array) => void
type StreamController = ReadableStreamDefaultController<Uint8Array>

type StreamEventType = `stream:${string}` | `client:${number}`

interface StreamSubscriptions {
  streamId: StreamID
  createdAt: Date
  updatedAt: Date
  lastEventId: number
  clients: (PipeToStream | null)[]
  attach(controller: StreamController): ClientID
  publish(message: string, type: StreamEventType): void
}

interface EncodeMessageParams {
  data: string
  type: StreamEventType
  lastEventId: number
  textEncoder: TextEncoder
}

function msg(props: { data: string; lastEventId: number; type: string }) {
  return `id: ${props.lastEventId}\nevent: ${props.type}\n data: ${props.data}\n\n`
}

function encodeToUInt8Array({
  data,
  type,
  lastEventId,
  textEncoder,
}: EncodeMessageParams) {
  return textEncoder.encode(msg({ data, lastEventId, type }))
}

function createStreamStore() {
  const store = new Map<string, StreamSubscriptions>()

  function createGroup(streamId: string): StreamSubscriptions {
    const textEncoder = new TextEncoder()
    return {
      streamId: streamId,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastEventId: 0,
      clients: [],
      attach(controller: StreamController) {
        this.clients.push((encoded: Uint8Array) => {
          controller.enqueue(encoded)
        })
        return this.clients.length
      },
      publish(data, type) {
        this.updatedAt = new Date()
        const encoded = encodeToUInt8Array({
          data,
          type,
          textEncoder,
          lastEventId: this.lastEventId++,
        })
        for (let i = 0; i < this.clients.length; i++) {
          this.clients[i]?.(encoded)
        }
      },
    }
  }

  function createOrAttachSubscription(
    streamId: string,
    controller: StreamController
  ): ClientID {
    const sub = store.get(streamId) ?? createGroup(streamId)
    const clientId = sub.attach(controller)
    store.set(streamId, sub)
    sub.publish(
      `connected to https://consoledump.io/${streamId}!`,
      `client:${clientId}`
    )
    return clientId
  }

  return {
    startStream(streamId: string) {
      let clientId = -1
      return new ReadableStream<Uint8Array>({
        start(controller) {
          clientId = createOrAttachSubscription(streamId, controller)
        },
        cancel() {
          if (clientId === -1) return
          const current = store.get(streamId)
          if (!current || !current.clients[clientId]) return
          current?.publish(`disconnected!`, `client:${clientId}`)
          current.clients[clientId] = null
        },
      })
    },
  }
}
