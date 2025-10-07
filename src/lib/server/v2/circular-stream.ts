export interface CircularBuffer {
  buffer: Uint8Array
  bufferSize: number
  writePosition: number
  totalWritten: number
  getAvailableBytes(readPosition: number): number
  getDataView(readPosition: number): Uint8Array<ArrayBufferLike>
  canReadPosition(readPosition: number): boolean
  write(chunk: Uint8Array): number
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
export function makeCircularBuffer({ bufferSize }: BufferConfig): CircularBuffer {
  const buffer = new Uint8Array(bufferSize)
  return {
    buffer,
    bufferSize,
    writePosition: 0,
    totalWritten: 0,
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
    write(chunk: Uint8Array): number | never {
      // handle edge case where the chunk is bigger than the buffer
      if (chunk.length > bufferSize) {
        throw new ChunkTooLarge({ chunkSize: chunk.length, bufferSize })
      }

      const writePos = this.writePosition
      const chunkLength = chunk.length

      // handle case where data fits in current buffer
      if (writePos + chunkLength <= bufferSize) {
        this.buffer.set(chunk, writePos)
        this.writePosition = writePos + chunkLength
        this.writePosition = (writePos + chunkLength) % bufferSize
        return chunk.length
      }

      // handle case where data wraps current buffer
      const firstPartSize = bufferSize - writePos
      const secondPartSize = chunkLength - firstPartSize
      this.buffer.set(chunk.subarray(0, firstPartSize), writePos)
      this.buffer.set(chunk.subarray(firstPartSize), 0)
      this.writePosition = secondPartSize
      this.writePosition = (writePos + chunkLength) % bufferSize
      return chunk.length
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
  createdAt: Date
  updatedAt: Date
}

interface StreamConfig {
  streamId: string
  bufferSize: number
}

interface StreamSubscriber {
  controller: ReadableByteStreamController
  readPosition: number
}

/**
 * Creates a new writable stream which can have multiple readers.
 * @param baseConfig
 */
function createStream({ bufferSize }: StreamConfig) {
  // internal state for buffer, subscriptions, etc.
  const buffer = makeCircularBuffer({ bufferSize })
  const subscribers = new Set<StreamSubscriber>()
  const meta: StreamMetadata = {
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'init',
  }

  // helper method for writing new data to a subscription
  function writeToSubscription(subscription: StreamSubscriber) {
    if (buffer.writePosition === subscription.readPosition) return
    const readPos = subscription.readPosition
    const dataView = buffer.getDataView(readPos)
    console.log('[stream] writing to subscription:', dataView.length)
    // skip writing if empty
    if (dataView.length === 0) return

    // handle byob request if available
    const byobRequest = subscription.controller.byobRequest
    if (byobRequest) {
      console.log('[stream] handling byob request!')
      const view = byobRequest.view
      if (view && dataView.length <= view.byteLength) {
        new Uint8Array(view.buffer).set(dataView)
        byobRequest.respond(dataView.length)
        subscription.readPosition = buffer.writePosition
        return
      }
    }
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
    const subcription: StreamSubscriber = {
      controller,
      readPosition: buffer.writePosition,
    }
    subscribers.add(subcription)
    return subcription
  }

  // helper method for creating a subscription
  function createSubscription() {
    let self: StreamSubscriber
    return new ReadableStream({
      type: 'bytes',
      start: (controller) => {
        self = addSubscriber(controller)
      },
      pull: () => {
        console.log('[subscription] pulling...')
        writeToSubscription(self)
      },
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
    /** returns a new readable stream subscription. */
    pull: () => createSubscription(),

    /** pushes data from a readable stream to all subscriptions. */
    push: async (readable: ReadableStream<Uint8Array>) => {
      return readable.pipeTo(writableStream, {
        preventAbort: false,
        preventCancel: false,
        preventClose: true,
      })
    },

    write: async (chunk: Uint8Array) => {
      const writer = writableStream.getWriter()
      try {
        await writer.write(chunk)
      } finally {
        writer.releaseLock()
      }
    },
  }
}

/**
 * Consumes a readable stream by reading and decoding it's contents into an array.
 * @param readableStream text encoded stream.
 */
export async function consume(readableStream: ReadableStream<Uint8Array>): Promise<string[]> {
  const decoder = new TextDecoder()
  const reader = readableStream.getReader()
  const output = []
  while (true) {
    const { done, value } = await reader.read()
    if (done || !value) break
    const text = decoder.decode(value)
    console.log(text)
    output.push(text)
  }
  return output
}

// example usage

async function test() {
  const encoder = new TextEncoder()
  const stream = createStream({
    streamId: '123',
    bufferSize: 1024 * 64,
  })

  const sub = stream.pull()
  await stream.write(encoder.encode('Hello, world!'))
  await stream.write(encoder.encode('Testing'))
  consume(sub)
}

test().catch(console.warn)
