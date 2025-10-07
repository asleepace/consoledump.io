import { createBufferedStream, type BufferedStream } from './circular-stream'

export interface EventStreamConfig {
  streamId: string
}

export interface StreamMessage {
  id: number
  event?: string
  data: Uint8Array
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

  return {
    newStream(streamId = createStreamId()): BufferedStream {
      const bufferedStream = createBufferedStream({
        streamId,
        bufferSize,
        onCleanup(meta) {
          console.log('[event-stream] cleanup called:', meta.streamId)
          activeStreams.delete(meta.streamId)
        },
      })
      activeStreams.set(streamId, bufferedStream)
      bufferedStream.writeJson(bufferedStream.meta)
      return bufferedStream
    },
    hasStream(streamId: string): boolean {
      const stream = activeStreams.get(streamId)
      return stream?.meta.status === 'open'
    },
    getStream(streamId: string): BufferedStream | undefined {
      return activeStreams.get(streamId)
    },
    async pipeToSession(streamId: string, readable: ReadableStream<Uint8Array>) {
      if (!this.hasStream(streamId)) throw new Error(`Stream missing or closed (${streamId}).`)
      const stream = this.getStream(streamId)
      if (!stream) return console.warn(`missing session "${streamId}"!`)
      await stream.push(readable)
    },
  }
}
