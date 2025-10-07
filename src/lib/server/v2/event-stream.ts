import { createBufferedStream, type BufferedStream } from './circular-stream'

export interface EventStreamConfig {
  streamId: string
}

export interface StreamMessage {
  id: number
  event?: string
  data: Uint8Array
}

function createMessageEncoder() {
  const encoder = new TextEncoder()
  let eventId = 0
  function encodeMessage(message: StreamMessage): Uint8Array<ArrayBuffer> {
    const evnt = message.event ? `\nevent: ${message.event}` : ''
    const head = encoder.encode(`id: ${message.id}${evnt}\ndata: `)
    const tail = encoder.encode(`\n\n`)
    const headLength = head.length
    const tailLength = tail.length
    const dataLength = message.data.length
    const buffer = new Uint8Array(headLength + tailLength + dataLength)
    buffer.set(head, 0)
    buffer.set(message.data, headLength)
    buffer.set(tail, headLength + dataLength)
    return buffer
  }

  return new TransformStream<Uint8Array>({
    transform: (chunk, controller) => {
      const message = encodeMessage({ id: eventId++, data: chunk })
      controller.enqueue(message)
    },
    flush: (controller) => {
      console.log('[event-stream] flush called!')
    },
  })
}

function createEncoder() {
  const textEncoder = new TextEncoder()
  return {
    text(text: string): Uint8Array {
      return textEncoder.encode(text)
    },
    json(json: any): Uint8Array {
      return this.text(JSON.stringify(json))
    },
  }
}

/**
 * Map of currently active streams.
 */
const activeStreams = new Map<string, BufferedStream>()

const createStreamId = () => `${crypto.randomUUID().split('-')[0]}`

/**
 * Returns the current stream context.
 */
export function getStreamContext() {
  const bufferSize = 1024 * 64

  const enocde = createEncoder()

  return {
    newStream(streamId = createStreamId()): BufferedStream {
      const stream = createBufferedStream({
        transformer: createMessageEncoder(),
        streamId,
        bufferSize,
      })
      activeStreams.set(streamId, stream)
      stream.write(enocde.json({ type: 'stream:started', streamId, createdAt: new Date() }))
      return stream
    },
    hasStream(streamId: string): boolean {
      return activeStreams.has(streamId)
    },
    getStream(streamId: string): BufferedStream | undefined {
      return activeStreams.get(streamId)
    },
    async pipeToSession(streamId: string, readable: ReadableStream<Uint8Array>) {
      const stream = this.getStream(streamId)
      if (!stream) return console.warn(`missing session "${streamId}"!`)
      await stream.push(readable)
    },
  }
}
