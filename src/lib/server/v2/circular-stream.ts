import { Mutex } from '@asleepace/mutex'
import { ApiError } from './api-error'

interface CircularBuffer {
  buffer: Uint8Array
  bufferSize: number
  writePosition: number
  wrapCount: number
  readonly totalBytesWritten: number
  getDataView(readCursor: ReadCursor): Uint8Array<ArrayBufferLike>
  setWritePosition(writePosition: number): void
  getWriteCursor(): WriteCursor
  write(chunk: Uint8Array): void
}

interface BufferConfig {
  bufferSize: number
}

interface ChunkBufferSize {
  chunkSize: number
  bufferSize: number
}

interface ReadCursor {
  wrapCount: number
  readPosition: number
}

interface WriteCursor {
  wrapCount: number
  writePosition: number
}

class ChunkTooLarge extends ApiError {
  constructor(info: ChunkBufferSize) {
    super(`CircularBuffer: Chunk too large!`, info)
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

  type CachedDataFrame = ReadCursor & {
    dataFrame?: Uint8Array<ArrayBuffer>
  }

  const cached: CachedDataFrame = {
    dataFrame: undefined,
    readPosition: 0,
    wrapCount: 0,
  }

  function hasCached({ readPosition, wrapCount }: ReadCursor): boolean {
    return Boolean(cached.dataFrame && cached.readPosition === readPosition && cached.wrapCount === wrapCount)
  }

  function setCached(value: CachedDataFrame): void {
    cached.dataFrame = value.dataFrame
    cached.readPosition = value.readPosition
    cached.wrapCount = value.wrapCount
  }

  function clearCached() {
    cached.dataFrame = undefined
    cached.readPosition = -1
    cached.wrapCount = -1
  }

  return {
    buffer,
    bufferSize,
    writePosition: 0,
    wrapCount: 0,
    get totalBytesWritten(): number {
      return this.wrapCount * bufferSize + this.writePosition
    },
    getWriteCursor() {
      return { writePosition: this.writePosition, wrapCount: this.wrapCount }
    },
    setWritePosition(writePosition: number) {
      this.writePosition = writePosition % bufferSize
    },
    write(chunk: Uint8Array): void {
      // clear cached data frames on each write.
      clearCached()

      // handle edge case where the chunk is bigger than the buffer
      if (chunk.length > bufferSize) {
        throw new ChunkTooLarge({ chunkSize: chunk.length, bufferSize })
      }

      const writePos = this.writePosition
      const chunkLength = chunk.length

      // handle case where data fits in current buffer
      if (writePos + chunkLength <= bufferSize) {
        this.buffer.set(chunk, writePos)
        this.setWritePosition(writePos + chunkLength)
        return
      }

      // handle case where data wraps current buffer
      const firstPartSize = bufferSize - writePos
      this.buffer.set(chunk.subarray(0, firstPartSize), writePos)
      this.buffer.set(chunk.subarray(firstPartSize), 0)
      this.wrapCount++
      this.setWritePosition(writePos + chunkLength)
    },
    getDataView({ readPosition, wrapCount }: ReadCursor) {
      const wrappedOffset = this.wrapCount - wrapCount

      // @note throw on impossible state where subscription is ahead of buffer in times wrapped,
      // this signifies a bug in the code and needs to be handled.
      if (wrappedOffset < 0 || wrappedOffset >= 2) {
        throw new ApiError('Requested wrap count is out of sync with buffer:', { wrappedOffset })
      }

      // read position and cursor are in sync with buffer
      if (readPosition === this.writePosition && wrapCount === this.wrapCount) {
        return new Uint8Array(0)
      }

      // handle case where we have a cached dataview frame
      if (hasCached({ readPosition, wrapCount })) {
        console.log('[buffer] cache hit!')
        return cached.dataFrame!
      }

      // handle edge case where buffer has completely wrapped one full time
      if (readPosition === this.writePosition && wrappedOffset === 1) {
        const dataFrame = new Uint8Array(bufferSize)
        dataFrame.set(this.buffer.subarray(this.writePosition), 0)
        dataFrame.set(this.buffer.subarray(0, this.writePosition), this.writePosition)
        setCached({ readPosition, wrapCount, dataFrame })
        return dataFrame
      }

      // handle normal case where we just need to return a slice.
      if (readPosition <= this.writePosition) {
        return this.buffer.subarray(readPosition, this.writePosition)
      }

      // Buffer has wrapped: need to combine two parts
      const firstPartSize = this.bufferSize - readPosition
      const secondPartSize = this.writePosition
      const totalSize = firstPartSize + secondPartSize

      // Only create new array when buffer wraps (unavoidable)
      const dataFrame = new Uint8Array(totalSize)
      dataFrame.set(this.buffer.subarray(readPosition), 0)
      dataFrame.set(this.buffer.subarray(0, this.writePosition), firstPartSize)
      setCached({ wrapCount, readPosition, dataFrame })
      return dataFrame
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

// --- Keep Alive ---

function startKeepAlive(controller: ReadableByteStreamController, { interval = 15_000 } = {}) {
  const message = new TextEncoder().encode(': keep-alive\n\n')
  const intervalId = setInterval(() => controller.enqueue(message), interval)
  return () => clearInterval(intervalId)
}

type Status = 'init' | 'open' | 'closed'

interface ReadableSubscription {
  status: Status
  write: (chunk: ArrayBufferView<ArrayBuffer>) => void
  setCursor: (cursor: WriteCursor) => void
  cleanup: () => void
  destroy: () => void
  readPosition: number
  wrapCount: number
}

//  --- Readable Stream Logic ---

function createReadableStream(parent: {
  keepAlive: number
  onStarted: (sub: ReadableSubscription) => void
  onPullLatestData: (sub: ReadableSubscription) => void
  onClosed?: (sub: ReadableSubscription) => void
}) {
  const ctx: ReadableSubscription = {
    status: 'init',
    readPosition: 0,
    wrapCount: 0,
    write: () => {},
    cleanup: () => {},
    destroy: () => {},
    setCursor(cursor: WriteCursor) {
      this.readPosition = cursor.writePosition
      this.wrapCount = cursor.wrapCount
    },
  }
  return new ReadableStream({
    type: 'bytes',
    start: (controller) => {
      console.log('[subscriber] started!')
      ctx.status = 'open'
      ctx.write = (chunk) => controller.enqueue(chunk)
      ctx.cleanup = startKeepAlive(controller)
      ctx.destroy = () => controller.close()
      parent.onStarted(ctx)
    },
    pull: () => {
      console.log('[subscriber] pulled!')
      parent.onPullLatestData(ctx)
    },
    cancel: (reason: string) => {
      console.log('[subscriber] closed:', reason)
      ctx.status = 'closed'
      ctx.cleanup()
      parent.onClosed?.(ctx)
    },
  })
}

interface StreamMetadata {
  streamId: string
  status: Status
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
  const subscribers = new Set<ReadableSubscription>()
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
      return buffer.totalBytesWritten
    },
    get totalSubscribers() {
      return subscribers.size
    },
  } as const

  /**
   *  Helper method for writing data to a subscriber.
   *
   *  @todo find a way to cache the dataview slice.
   */
  function writeToSubscription(subscription: ReadableSubscription) {
    const dataView = buffer.getDataView(subscription)
    if (dataView.length === 0) return // skip writing if empty
    subscription.write(dataView.slice())
    subscription.setCursor(buffer.getWriteCursor())
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
      subscribers.forEach((sub) => sub.destroy())
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
    pull: () =>
      createReadableStream({
        keepAlive: keepAliveInterval,
        onStarted(subscription) {
          subscribers.add(subscription)
        },
        onPullLatestData(subscription) {
          const dataView = buffer.getDataView(subscription)
          if (dataView.length === 0) return

          subscription.write(dataView.slice())
          subscription.setCursor(buffer.getWriteCursor())
        },
        onClosed(sub) {
          subscribers.delete(sub)
        },
      }),

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
      subscribers.forEach((sub) => sub.destroy())
      subscribers.clear()
    },
  }
}
