import { Mutex } from '@asleepace/mutex'
import { ApiError } from '../v2/api-error'
import { Try } from '@asleepace/try'

/**
 * Creates a server-side event encoder which is used to re-encode
 * arbitrary bytes as sse messages.
 *
 * Also includes several helper methods for encoding different types
 * of text data like comments, json, plain.
 */
export function makeServerSideEventEncoder() {
  const textEncoder = new TextEncoder()
  let eventId = 0
  return {
    event(message: { data?: Uint8Array; id?: number; event?: string }): ByteStream {
      const evnt = message.event ? `event: ${message.event}` : ''
      const idno = message.id ? `id: ${message.id}` : ''
      const data = message.data ? `data:` : ''
      const head = textEncoder.encode([idno, evnt, data].filter((s) => !!s).join('\n'))
      const tail = textEncoder.encode(`\n\n`)
      const headLength = head.length
      const tailLength = tail.length
      const dataLength = message.data?.length ?? 0
      const buffer = new Uint8Array(headLength + tailLength + dataLength)
      buffer.set(head, 0)
      if (message.data) {
        buffer.set(message.data, headLength)
      }
      buffer.set(tail, headLength + dataLength)
      return buffer
    },
    /** returns an encoded json object in data: {} only sse format. */
    data(jsonObject: object): ByteStream {
      const data = this.json(jsonObject)
      return this.event({ data })
    },
    json(jsonData: object): ByteStream {
      return this.text(JSON.stringify(jsonData))
    },
    text(textData: string): ByteStream {
      return textEncoder.encode(textData)
    },
    /** returns a sse comment ": exmaple" which is ignored by `EventSource`. */
    comment(comment: `: ${string}`): ByteStream {
      return textEncoder.encode(comment + '\n\n')
    },
    transformToServerSideEvent() {
      return new TransformStream<Uint8Array>({
        transform: (data, controller) => {
          const sse = this.event({ data, id: eventId++ })
          controller.enqueue(sse)
        },
      })
    },
  }
}

interface CircularBuffer {
  buffer: Uint8Array
  bufferSize: number
  writePosition: number
  wrapCount: number
  totalBytesWritten: number
  getAvailableSpace(): number
  getDataView(readPosition: number): Uint8Array<ArrayBufferLike>
  setWritePosition(chunkSize: number): void
  write(chunk: Uint8Array): void
}

const KB = 1024
const MB = KB * KB
const GB = KB * MB

const MAX_BUFFER_SIZE = 5 * MB

/**
 *  ## Circular Bufffer
 *
 *  Returns a circular buffer which has a fixed sized, but can be written to
 *  an unlimited amount of times.
 *
 *  @note this class can throw if the chunk size is too large or an invalid
 *  readPosition is passed.
 */
export function makeCircularBuffer({ bufferSize = MAX_BUFFER_SIZE }): CircularBuffer {
  const buffer = new Uint8Array(bufferSize)

  return {
    buffer,
    bufferSize,
    writePosition: 0,
    totalBytesWritten: 0,
    wrapCount: 0,
    setWritePosition(chunkSize: number) {
      this.writePosition = (this.writePosition + chunkSize) % bufferSize
      this.totalBytesWritten += chunkSize
    },
    getAvailableSpace() {
      return bufferSize - this.writePosition
    },
    write(chunk: Uint8Array): void {
      if (chunk.length > this.bufferSize) {
        throw new ApiError('Chunk too large!', { chunkSize: chunk.length, bufferSize })
      }

      const writePos = this.writePosition
      const chunkLength = chunk.length

      // handle case where data fits in current buffer
      if (writePos + chunkLength <= bufferSize) {
        this.buffer.set(chunk, writePos)
        this.setWritePosition(chunkLength)
        return
      }

      // handle case where data wraps current buffer
      const firstPartSize = bufferSize - writePos
      this.buffer.set(chunk.subarray(0, firstPartSize), writePos)
      this.buffer.set(chunk.subarray(firstPartSize), 0)
      this.wrapCount++
      this.writePosition = (writePos + chunkLength) % this.bufferSize
      this.totalBytesWritten += chunkLength
    },
    getDataView(readPosition: number) {
      // read position and cursor are in sync with buffer
      if (readPosition === this.writePosition) {
        return new Uint8Array(0)
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
      return dataFrame
    },
  }
}

type ByteStream = Uint8Array<ArrayBuffer>
type ReadableByteStream = ReadableStream<ByteStream>
type ChunkCallback = (chunk: ByteStream) => void | Promise<void>

async function iterateFileChunks(file: Bun.BunFile, callback: ChunkCallback) {
  if (!(await file.exists())) return void console.warn('[iterate] file not found:', file.name)
  console.log('[file] loading:', file.name, file.size)
  return await iterateChunks(file.stream(), callback)
}

async function iterateChunks(readableStream: ReadableStream, callback: ChunkCallback) {
  const reader = readableStream.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      await callback(value)
    }
  } catch (e) {
    console.warn('[chunks] error:', e)
  } finally {
    reader.releaseLock()
  }
}

/**
 * ## File Base Stream
 *
 * This function creates a readable stream which can have multiple subscribers,
 * and can publish incoming streams to each subscriber and persist to disk.
 *
 *  - new subscribers should be hyrdated with entire history
 *  - we use a circular buffer to hold a slice in memory
 *  - incoming stream data is transformed to sse format (once)
 *  - TODO: periodically synchronize to disk
 *  - TODO: handle edge cases
 *
 * @note this is currently just a PoC
 */
export async function createFileBasedStream(options: { streamId: string }) {
  const filePath = `./public/dumps/${options.streamId}.log`
  const file = Bun.file(filePath)
  const fileWriter = file.writer()
  const mutex = new Mutex()

  const doesFileExist = await file.exists()
  console.log('[stream] file:', {
    name: file.name,
    exists: doesFileExist,
    size: file.size,
  })

  const activeStreams = new Set<ReadableStreamDefaultController>()
  const sse = makeServerSideEventEncoder()

  const meta = {
    streamId: options.streamId,
    lastChildId: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    get totalStreams() {
      return activeStreams.size
    },
  }

  /** an in-memory buffer which holds a short preview of data. */
  const bufferSize = 1024 * 1024 * 5
  const sharedBuffer = makeCircularBuffer({ bufferSize: 1024 * 1024 * 5 })

  /** hydrate buffer if the file size is small enough. */
  if (file.size < bufferSize) {
    console.log('[buffer] hydrating')
    await iterateFileChunks(file, (chunk) => {
      sharedBuffer.write(chunk)
    })
  } else {
    console.warn('[buffer] file size too large to hydrate!', file.size)
  }

  /** publish data to all streams. */
  function broadcast(data: object): void {
    publish(Response.json(data).body!)
  }

  /** broadcast a chunk to all active streams. */
  function broadcastToStreams(chunk: ByteStream) {
    for (const stream of activeStreams) {
      try {
        stream.enqueue(chunk)
      } catch (e) {
        console.warn('[broadcast] error:', e)
        activeStreams.delete(stream)
        Try.catch(() => stream.error(e))
      }
    }
  }

  /** Publishes incoming data to file + live subscribers. */
  async function publish(readableStream: ReadableByteStream): Promise<void> {
    meta.updatedAt = new Date()
    const lock = await mutex.acquireLock()
    try {
      const incomingStream = readableStream.pipeThrough(sse.transformToServerSideEvent())

      await iterateChunks(incomingStream, async (chunk) => {
        sharedBuffer.write(chunk)
        broadcastToStreams(chunk)
        fileWriter.write(chunk)
        await fileWriter.flush()
      })
    } finally {
      lock.releaseLock()
    }
  }

  async function handleGarbageCollection() {
    if (activeStreams.size > 0) return
    console.log('[stream] garbase collection called!')
    await fileWriter.end()
  }

  /**
   * Returns SSE stream with file history + live updates
   */
  async function createSubscription() {
    let childId = crypto.randomUUID().slice(0, 8)
    let cleanup = () => {}
    return new ReadableStream({
      type: 'bytes',
      async start(controller) {
        controller.enqueue(sse.data({ childId, ...meta }))

        if (sharedBuffer.wrapCount > 0) {
          const lock = await mutex.acquireLock({ timeout: 5_000 })
          try {
            // send history
            await iterateFileChunks(file, (chunks) => {
              controller.enqueue(chunks)
            })

            activeStreams.add(controller)
            cleanup = () => activeStreams.delete(controller)
            broadcast({ type: 'client:connected', childId })
          } catch (e) {
            console.error('[subscribe] error:', e)
            activeStreams.delete(controller)
            Try.catch(() => controller.error(e))
          } finally {
            lock.releaseLock()
          }
        } else {
          controller.enqueue(sharedBuffer.buffer.slice(0, sharedBuffer.writePosition))
          activeStreams.add(controller)
          cleanup = () => activeStreams.delete(controller)
        }
      },
      cancel() {
        console.log('[subscription] closed!')
        cleanup()
        handleGarbageCollection()
      },
    })
  }

  return {
    publish,
    async close() {
      console.log('[close] called!')
      await fileWriter.end()
      activeStreams.forEach((stream) => {
        Try.catch(() => stream.close())
      })
      activeStreams.clear()
    },
    async subscribe() {
      console.log('[subscribe] called!')
      const responseBody = await createSubscription()
      return new Response(responseBody, {
        headers: {
          'content-type': 'text/event-stream',
          'cache-control': 'no-cache',
          'x-stream-id': `${options.streamId}`,
          connection: 'keep-alive',
        },
      })
    },
  }
}
