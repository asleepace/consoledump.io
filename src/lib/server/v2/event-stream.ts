import { createBufferedStream, type BufferedStream } from './circular-stream'
import { ApiError } from './api-error'

export interface EventStreamConfig {
  streamId: string
}

export interface StreamMessage {
  id: number
  event?: string
  data: Uint8Array
}

/**
 *  Map of currently active streams.
 */
const activeStreams = new Map<string, BufferedStream>()

/**
 *  Creates a new random string to be used as a streamId.
 */
function createStreamId() {
  return crypto.randomUUID().slice(0, 6)
}

const KB = 1024
const MB = KB * KB
const GB = KB * MB

/**
 *  ## Stream Context
 *
 *  Returns the current stream context.
 */
export function getStreamContext() {
  const maxMemoryLimit = 2 * GB
  const bufferSize = 2 * MB

  return {
    /**
     *  Returns true if adding one more buffer would push us past the
     *  maiximum memory limit.
     */
    isOutOfMemory(): boolean {
      return this.getMemoryUsage() + bufferSize >= maxMemoryLimit
    },
    /**
     *  Memory usage of all active streams in MB.
     */
    getMemoryUsage(): number {
      return activeStreams.size * bufferSize
    },
    createStream(streamId = createStreamId()): BufferedStream {
      const usage = this.getMemoryUsage()

      // prevent application memory from unbounded growth
      if (usage >= maxMemoryLimit) {
        throw new ApiError('Out of memory.', { usage, maxMemoryLimit })
      }

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
      return Boolean(this.getStream(streamId))
    },
    getStream(streamId: string): BufferedStream | undefined {
      const stream = activeStreams.get(streamId)
      return stream?.meta.status === 'open' ? stream : undefined
    },
    getStreamOrThrow(streamId: string): BufferedStream | never {
      const stream = activeStreams.get(streamId)
      // (404: Not Found) Handle case where stream not found.
      if (!stream) {
        throw new ApiError('Stream not found:', { streamId })
      }
      // (410: Gone) Handle case where stream is closed.
      if (stream.isClosed) {
        throw new ApiError('Stream is closed:', { streamId }).toResponse({ status: 410 })
      }
      // otherwise return buffered stream
      return stream
    },
    getStreamResponse(streamId: string): Response {
      const stream = activeStreams.get(streamId)

      // (404: Not Found) Handle case where stream not found.
      if (!stream) {
        return new ApiError('Stream not found:', { streamId }).toResponse({ status: 404 })
      }

      // (410: Gone) Handle case where stream is closed.
      if (stream.isClosed) {
        return new ApiError('Stream is closed:', { streamId }).toResponse({ status: 410 })
      }

      // Create subscriber and return response
      return new Response(stream.pull(), {
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'HEAD, GET, POST, PUT, DELETE, OPTIONS',
          'content-type': 'text/event-stream',
          'transfer-encoding': 'chunked',
          'x-accel-buffering': 'no',
          'x-stream-id': stream.streamId,
        },
      })
    },
    async pipeToSession(streamId: string, readable: ReadableStream<Uint8Array>) {
      const stream = this.getStreamOrThrow(streamId)
      await stream.push(readable)
    },
  }
}
