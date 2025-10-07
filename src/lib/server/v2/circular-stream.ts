console.clear()

interface CircularBuffer {
  buffer: Uint8Array
  bufferSize: number
  writePosition: number
  totalWritten: number
  getAvailableBytes(readPosition: number): number
  getDataView(readPosition: number): Uint8Array<ArrayBufferLike>
  setWritePosition(writePosition: number): void
  canReadPosition(readPosition: number): boolean
  write(chunk: Uint8Array): void
}

interface BufferConfig {
  bufferSize: number
}

interface ChunkBufferSize {
  chunkSize: number
  bufferSize: number
}

interface ReadPosition {
  readPosition: number
  bufferSize: number
}

class BufferError extends Error {}
class InvalidReadPosition extends BufferError {
  constructor({ readPosition, bufferSize }: ReadPosition) {
    super(`CircularBuffer: Read position (${readPosition}) exceeds buffer size (${bufferSize}).`)
  }
}

class ChunkTooLarge extends BufferError {
  constructor({ chunkSize, bufferSize }: ChunkBufferSize) {
    super(`CircularBuffer: Tried to write chunk (${chunkSize} bytes) to buffer (${bufferSize} bytes).`)
  }
}

/**
 *  Returns a circular buffer which has a fixed sized, but can be written to
 *  an unlimited amount of times.
 *
 *  @param {Object} config
 *  @param {number} config.bufferSize max size of the buffer.
 *
 *  @note this class can throw if the chunk size is too large or an invalid
 *  readPosition is passed.
 */
function makeCircularBuffer({ bufferSize }: BufferConfig): CircularBuffer {
  const buffer = new Uint8Array(bufferSize)
  return {
    buffer,
    bufferSize,
    writePosition: 0,
    totalWritten: 0,
    setWritePosition(writePosition: number) {
      this.writePosition = writePosition % bufferSize
    },
    canReadPosition(readPosition: number) {
      if (readPosition < 0 || readPosition >= this.bufferSize) {
        return false
      }
      // Haven't filled buffer yet
      if (this.totalWritten <= this.bufferSize) {
        return readPosition <= this.writePosition
      }

      // Buffer has wrapped - check if position hasn't been overwritten
      const bytesOverwritten = this.totalWritten - this.bufferSize
      return readPosition >= bytesOverwritten % this.bufferSize
    },
    getAvailableBytes(readPosition: number): number {
      if (!this.canReadPosition(readPosition)) throw new InvalidReadPosition({ readPosition, bufferSize })
      const writePos = this.writePosition
      if (readPosition === writePos) return 0
      if (readPosition < writePos) return writePos - readPosition
      return this.bufferSize - readPosition + writePos
    },
    write(chunk: Uint8Array): void {
      // handle edge case where the chunk is bigger than the buffer
      if (chunk.length > bufferSize) {
        throw new ChunkTooLarge({ chunkSize: chunk.length, bufferSize })
      }

      const writePos = this.writePosition
      const chunkLength = chunk.length

      // handle case where data fits in current buffer
      if (writePos + chunkLength <= bufferSize) {
        this.buffer.set(chunk, writePos)
        this.totalWritten += chunk.length
        this.setWritePosition(writePos + chunkLength)
        return
      }

      // handle case where data wraps current buffer
      const firstPartSize = bufferSize - writePos
      this.buffer.set(chunk.subarray(0, firstPartSize), writePos)
      this.buffer.set(chunk.subarray(firstPartSize), 0)
      this.totalWritten += chunk.length
      this.setWritePosition(writePos + chunkLength)
    },
    getDataView(readPosition: number) {
      if (!this.canReadPosition(readPosition)) throw new InvalidReadPosition({ readPosition, bufferSize })
      if (readPosition === this.writePosition) return new Uint8Array(0)
      if (readPosition <= this.writePosition) return this.buffer.subarray(readPosition, this.writePosition)
      // Buffer has wrapped: need to combine two parts
      const firstPartSize = this.bufferSize - readPosition
      const secondPartSize = this.writePosition
      const totalSize = firstPartSize + secondPartSize

      // Only create new array when buffer wraps (unavoidable)
      const result = new Uint8Array(totalSize)
      result.set(this.buffer.subarray(readPosition), 0)
      result.set(this.buffer.subarray(0, this.writePosition), firstPartSize)
      return result
    },
  }
}

interface StreamMetadata {
  status: 'init' | 'open' | 'closed'
  updatedAt: Date
  readonly createdAt: Date
  readonly totalSubscribers: number
  readonly totalBytesWritten: number
}

interface StreamConfig {
  streamId: string
  bufferSize: number
  transformer: TransformStream<Uint8Array>
}

interface StreamSubscriber {
  controller: ReadableByteStreamController
  readPosition: number
}

export interface BufferedStream {
  pull: () => ReadableStream<Uint8Array>
  push: (readable: ReadableStream<Uint8Array>) => Promise<void>
  write: (chunk: Uint8Array) => Promise<void>
  close: () => Promise<void>
  metadata: () => StreamMetadata
  getStreamId: () => string
}

/**
 * Creates a new writable stream which can have multiple readers.
 * @param baseConfig
 */
export function createBufferedStream({ bufferSize, streamId, transformer }: StreamConfig): BufferedStream {
  // internal state for buffer, subscriptions, etc.
  const buffer = makeCircularBuffer({ bufferSize })
  const subscribers = new Set<StreamSubscriber>()

  const meta: StreamMetadata = {
    status: 'init',
    createdAt: new Date(),
    updatedAt: new Date(),
    get totalBytesWritten() {
      return buffer.totalWritten
    },
    get totalSubscribers() {
      return subscribers.size
    },
  } as const

  // handle special case where byob is present.
  function handleByobRequest(sub: StreamSubscriber, dataView: Uint8Array<ArrayBufferLike>): boolean {
    if (!sub.controller.byobRequest?.view) return false
    const view = sub.controller.byobRequest.view
    if (dataView.length > view.byteLength) return false
    new Uint8Array(view.buffer).set(dataView)
    sub.controller.byobRequest.respond(dataView.length)
    sub.readPosition = buffer.writePosition
    return true
  }

  // helper method for writing new data to a subscription
  function writeToSubscription(subscription: StreamSubscriber) {
    if (buffer.writePosition === subscription.readPosition) return
    const readPos = subscription.readPosition
    const dataView = buffer.getDataView(readPos)
    // skip writing if empty
    if (dataView.length === 0) return
    // handle byob request if available
    if (handleByobRequest(subscription, dataView)) return
    // write data view to stream
    subscription.controller.enqueue(dataView.slice())
    subscription.readPosition = buffer.writePosition
  }

  /**
   * Create a new subscription with a readable stream controller, this will
   * be added to the set of stream subscribers and contains helpers for
   * shutting down.
   */
  function addSubscriber(controller: ReadableByteStreamController) {
    const sub: StreamSubscriber = {
      controller,
      readPosition: buffer.writePosition,
    }
    subscribers.add(sub)
    return sub
  }

  // helper method for creating a subscription
  function createSubscription() {
    let self: StreamSubscriber
    return new ReadableStream({
      type: 'bytes',
      start: (controller) => {
        self = addSubscriber(controller)
      },
      pull: () => writeToSubscription(self),
      cancel: (reason) => {
        console.log('[subscription] cancelled:', reason)
        subscribers.delete(self)
      },
    })
  }

  // base writable stream which should be written to
  const writableStream = new WritableStream<Uint8Array>({
    start: () => {
      meta.status = 'open'
    },
    write: (chunk) => {
      meta.updatedAt = new Date()
      buffer.write(chunk)
      subscribers.forEach(writeToSubscription)
    },
    close: () => {
      meta.status = 'closed'
      console.warn('[writable] stream closed!')
      subscribers.forEach((sub) => sub.controller.close())
      subscribers.clear()
    },
  })

  return {
    metadata: () => meta,
    getStreamId: () => streamId,

    /** returns a new readable stream subscription. */
    pull: () => createSubscription(),

    /** pushes data from a readable stream to all subscriptions. */
    push: async (readable: ReadableStream<Uint8Array>) => {
      try {
        return readable.pipeThrough(transformer).pipeTo(writableStream, {
          preventAbort: false,
          preventCancel: false,
          preventClose: true,
        })
      } catch (e) {
        console.warn('[circular-strema] push error:', e)
      }
    },

    write: async (chunk: Uint8Array) => {
      const writer = writableStream.getWriter()
      try {
        await writer.write(chunk)
      } finally {
        writer.releaseLock()
      }
    },

    close: async () => {
      meta.status = 'closed'
      writableStream.close()
      subscribers.forEach((sub) => sub.controller.close())
      subscribers.clear()
    },
  }
}
