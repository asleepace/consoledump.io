import { Mutex } from '@asleepace/mutex'

interface CircularBuffer {
  buffer: Uint8Array
  bufferSize: number
  writePosition: number
  wrapCount: number
  totalWritten: number
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
 *  ## Circular Bufffer
 *
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
    wrapCount: 0,
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
      this.wrapCount += 1
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

interface StreamMessage {
  id: number
  event?: string
  data: Uint8Array
}

/**
 * Returns a server-side event encoder which wraps arbitrary data into
 * the sse format with incramenting eventIds and optional types.
 *
 * @note prefer to use the transform as it's more efficient.
 */
export function createServerSideEventEncoder() {
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

  function sse(chunk: Uint8Array) {
    return encodeMessage({ id: eventId++, data: chunk })
  }

  return {
    get eventId() {
      return eventId
    },
    transformToServerSideEvent() {
      return new TransformStream<Uint8Array>({
        transform: (chunk, controller) => controller.enqueue(sse(chunk)),
      })
    },
    chunkToServerSideEvent(chunk: Uint8Array) {
      return new ReadableStream({
        start: (controller) => {
          controller.enqueue(sse(chunk))
          controller.close()
        },
      })
    },
  }
}

interface StreamMetadata {
  streamId: string
  status: 'init' | 'open' | 'closed'
  updatedAt: Date
  readonly createdAt: Date
  readonly totalSubscribers: number
  readonly totalBytesWritten: number
}

interface StreamConfig {
  streamId: string
  bufferSize: number
  keepAliveInterval?: number
  onCleanup?: (meta: StreamMetadata) => void | Promise<void>
}

interface StreamSubscriber {
  controller: ReadableByteStreamController
  readPosition: number
  wrapCount: number
}

export interface BufferedStream {
  pull: () => ReadableStream<Uint8Array>
  push: (readable: ReadableStream<Uint8Array>) => Promise<void>
  write: (chunk: Uint8Array) => Promise<void>
  writeText: (text: string) => Promise<void>
  writeJson: (json: object) => Promise<void>
  close: () => Promise<void>
  readonly streamId: string
  readonly meta: StreamMetadata
  readonly isReady: Promise<void>
  readonly isClosed: boolean
}

/**
 *  ## Bufferd Stream
 *
 *  Creates a new writable stream which can have multiple readers.
 *
 *  @param {Object} baseConfig
 *  @param {Number} baseConfig.bufferSize max size of buffer.
 *  @param {String} baseConfig.streamId unique identifier.
 *  @param {Number} baseConfig.keepAliveInterval number in ms where pings are sent to client.
 *  @param {Function} baseConfig.onCleanup (optional) callback when closed.
 */
export function createBufferedStream({
  bufferSize,
  streamId,
  keepAliveInterval = 30_000,
  onCleanup,
}: StreamConfig): BufferedStream {
  // internal state for buffer, subscriptions, etc.
  const buffer = makeCircularBuffer({ bufferSize })
  const subscribers = new Set<StreamSubscriber>()
  const textEncoder = new TextEncoder()
  const mutex = new Mutex()

  const isReady = Promise.withResolvers<void>()
  const serverSideEncoder = createServerSideEventEncoder()

  const meta: StreamMetadata = {
    status: 'init',
    streamId,
    createdAt: new Date(),
    updatedAt: new Date(),
    get totalBytesWritten() {
      return buffer.totalWritten
    },
    get totalSubscribers() {
      return subscribers.size
    },
  } as const

  /**
   *  Helper method for writing data to a subscriber.
   *
   *  @todo fix rare edge case where data wraps back to current position
   *  so the read positions appear the same.
   */
  function writeToSubscription(subscription: StreamSubscriber) {
    if (buffer.writePosition === subscription.readPosition && buffer.wrapCount === subscription.wrapCount) return
    const readPos = subscription.readPosition
    const dataView = buffer.getDataView(readPos)
    // skip writing if empty
    if (dataView.length === 0) return
    // write data view to stream
    subscription.controller.enqueue(dataView.slice())
    subscription.readPosition = buffer.writePosition
    subscription.wrapCount = buffer.wrapCount
  }

  /**
   * Create a new subscription with a readable stream controller, this will
   * be added to the set of stream subscribers and contains helpers for
   * shutting down.
   */
  function addSubscriber(controller: ReadableByteStreamController) {
    const sub: StreamSubscriber = {
      controller,
      readPosition: 0,
      wrapCount: 0,
    }
    subscribers.add(sub)
    return sub
  }

  function startKeepAlive(callback: () => void) {
    const intervalId = setInterval(callback, keepAliveInterval)
    return () => clearInterval(intervalId)
  }

  // helper method for creating a subscription
  function createSubscription() {
    let self: StreamSubscriber
    return new ReadableStream({
      type: 'bytes',
      start: (controller) => {
        self = addSubscriber(controller)
        startKeepAlive(() => {
          // send a server-side event comment to keep stream alive
          const heartbeat = textEncoder.encode(': keep-alive\n\n')
          controller.enqueue(heartbeat)
        })
      },
      pull: () => {
        if (!self) return console.warn('[subscription] missing self!')
        writeToSubscription(self)
      },
      cancel: (reason) => {
        console.log('[subscription] cancelled:', reason)
        subscribers.delete(self)
      },
    })
  }

  function handleWriteToBuffer(chunk: Uint8Array) {
    meta.updatedAt = new Date()
    // handle case where chunk fits in available spaxe
    if (chunk.length < buffer.bufferSize) {
      buffer.write(chunk)
      subscribers.forEach(writeToSubscription)
      return
    }

    let i = 1
    let head = 0
    let tail = i * bufferSize
    while (tail <= chunk.length) {
      console.log('[circular-stream] parsing large chunk...')
      const subChunk = chunk.slice(head, tail)
      if (subChunk.length === 0) break
      buffer.write(subChunk)
      subscribers.forEach(writeToSubscription)
      head = tail
      tail = ++i * bufferSize
    }
  }

  // base writable stream which should be written to
  const writableStream = new WritableStream<Uint8Array>({
    start: () => {
      console.log('[writable] writable isReady!')
      meta.status = 'open'
      isReady.resolve()
    },
    write: (chunk) => {
      handleWriteToBuffer(chunk)
    },
    close: () => {
      meta.status = 'closed'
      console.warn('[writable] stream closed!')
      subscribers.forEach((sub) => sub.controller.close())
      subscribers.clear()
      onCleanup?.(meta)
    },
  })

  return {
    /** flag which is true when the writable stream has started. */
    get isReady() {
      return isReady.promise
    },

    /** returns `true` if the stream was closed. */
    get isClosed() {
      return meta.status === 'closed'
    },

    /** returns metadata about the stream. */
    get meta() {
      return meta
    },

    /** returns the current streamId */
    get streamId() {
      return streamId
    },

    /** returns a new readable stream subscription. */
    pull: () => createSubscription(),

    /** pushes data from a readable stream to all subscriptions. */
    push: async (readable: ReadableStream<Uint8Array>) => {
      const lock = await mutex.acquireLock({ timeout: 10_000 })
      try {
        await readable
          .pipeThrough(serverSideEncoder.transformToServerSideEvent())
          .pipeTo(writableStream, { preventAbort: false, preventCancel: false, preventClose: true })
      } catch (e) {
        console.warn('[circular-stream] push error:', e)
      } finally {
        lock.releaseLock()
      }
    },

    /** encodes an arbitrary chunk and broadcasts to all streams. */
    write: async (chunk: Uint8Array) => {
      const lock = await mutex.acquireLock({ timeout: 10_000 })
      try {
        await serverSideEncoder.chunkToServerSideEvent(chunk).pipeTo(writableStream, { preventClose: true })
      } catch (e) {
        console.warn('[circular-stream] write error:', e)
      } finally {
        lock.releaseLock()
      }
    },

    /** helper which encodes text and then calls `write(chunk)` with bytes. */
    async writeText(text) {
      await this.write(textEncoder.encode(text))
    },

    /** helper which encodes json and then calls `write(chunk)` with bytes. */
    async writeJson(json) {
      await this.writeText(JSON.stringify(json))
    },

    close: async () => {
      meta.status = 'closed'
      writableStream.close()
      subscribers.forEach((sub) => sub.controller.close())
      subscribers.clear()
    },
  }
}
