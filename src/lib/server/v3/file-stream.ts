import { Mutex } from '@asleepace/mutex'
import { ApiError } from '../v2/api-error'
import { Try } from '@asleepace/try'

import { BufferedFile } from './buffered-file'

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

const BUFFER_SIZE = 5 * MB
const MAX_FILE_SIZE = 20 * MB

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

class StreamSubscriber {
  public readonly createdAt = new Date()
  public updatedAt = new Date()
  public isAlive = true

  public get lastAliveInMs() {
    return Date.now() - +this.updatedAt
  }

  constructor(public readonly controller: ReadableByteStreamController, public cleanup = () => {}) {}

  public send(chunk: ByteStream) {
    try {
      this.controller.enqueue(chunk)
      this.updatedAt = new Date()
    } catch (e) {
      console.warn('[subscriber] error:', e)
      this.isAlive = false
      Try.catch(() => this.controller.error(e))
      this.cleanup()
    }
  }

  public close() {
    console.log('[subscriber] closed!')
    this.controller.close()
    this.cleanup()
    this.isAlive = false
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
  const mutex = new Mutex()

  const bufferedFile = new BufferedFile({
    fileName: `${options.streamId}.log`,
    maxFileSize: MAX_FILE_SIZE,
    bufferSize: BUFFER_SIZE,
  })

  await bufferedFile.hydrateBuffer()
  await bufferedFile.getInfo()

  const activeStreams = new Set<StreamSubscriber>()
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

  /** publish data to all streams. */
  function broadcastEvent(data: object): void {
    publish(Response.json(data).body!)
  }

  /** broadcast a chunk to all active streams. */
  function broadcastToStreams(chunk: ByteStream) {
    for (const subscriber of activeStreams) {
      subscriber.send(chunk)
    }
  }

  /** Witable stream which broadcasts to all subscribers. */
  function writableBroadcast() {
    return new WritableStream({
      write: (chunk) => broadcastToStreams(chunk),
    })
  }

  /** Publishes incoming data to file + live subscribers. */
  async function publish(readableStream: ReadableByteStream): Promise<void> {
    const lock = await mutex.acquireLock()
    try {
      await readableStream
        .pipeThrough(sse.transformToServerSideEvent())
        .pipeThrough(bufferedFile.persistTransform())
        .pipeTo(writableBroadcast(), { preventClose: true })
    } finally {
      meta.updatedAt = new Date()
      lock.releaseLock()
    }
  }

  /** Called when no more active streams are left. */
  async function handleGarbageCollection() {
    for (const subscriber of activeStreams) {
      // TODO: remove closed clients.
      if (!subscriber.isAlive) {
        activeStreams.delete(subscriber)
      }
    }
    if (activeStreams.size > 0) return
    console.log('[stream] garbage collection called!')
    await bufferedFile.close()
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
        const subscriber = new StreamSubscriber(controller, () => {
          activeStreams.delete(subscriber)
        })

        try {
          // pass first message with streamId and info
          subscriber.send(sse.data({ childId, ...meta }))

          // hydrate stream
          for await (const chunk of bufferedFile.streamData()) {
            subscriber.send(chunk.slice())
          }
        } catch (e) {
          console.error('[subscribe] error:', e)
          Try.catch(() => controller.error(e))
        } finally {
          // add to subscribers
          activeStreams.add(subscriber)
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
      await bufferedFile.close()
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
