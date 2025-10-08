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
    event(message: { data?: Uint8Array; id?: number; event?: string }): ByteChunk {
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
    data(jsonObject: object): ByteChunk {
      const data = this.json(jsonObject)
      return this.event({ data })
    },
    json(jsonData: object): ByteChunk {
      return this.text(JSON.stringify(jsonData))
    },
    text(textData: string): ByteChunk {
      return textEncoder.encode(textData)
    },
    /** returns a sse comment ": exmaple" which is ignored by `EventSource`. */
    comment(comment: `: ${string}`): ByteChunk {
      return textEncoder.encode(comment + '\n\n')
    },
    transformToServerSideEvent() {
      return new TransformStream<ByteChunk>({
        transform: (data, controller) => {
          const sse = this.event({ data, id: eventId++ })
          controller.enqueue(sse)
        },
      })
    },
  }
}

// --- constants ---

const KB = 1024
const MB = KB * KB
const GB = KB * MB

const BUFFER_SIZE = 5 * MB
const MAX_FILE_SIZE = 20 * MB

type ByteChunk = Uint8Array<ArrayBuffer>
type ByteStream = ReadableStream<ByteChunk>

// --- stream subscriber ---

class StreamSubscriber {
  public readonly createdAt = new Date()
  public updatedAt = new Date()
  public isAlive = true

  public get lastAliveInMs() {
    return Date.now() - +this.updatedAt
  }

  constructor(public readonly controller: ReadableByteStreamController, public cleanup = () => {}) {}

  public send(chunk: ByteChunk) {
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

  /** broadcast a chunk to all active streams. */
  function broadcastToStreams(chunk: ByteChunk) {
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
  async function publish(readableStream: ByteStream): Promise<void> {
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
        // instantiate a new subscription with a ref to the controller
        const subscriber = new StreamSubscriber(controller, () => {
          activeStreams.delete(subscriber)
        })

        try {
          // pass first message with streamId and info
          subscriber.send(sse.data({ childId, ...meta }))

          // hydrate stream
          for await (const chunk of bufferedFile.byteStream()) {
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
    /** broadcast an event to all streams & file. */
    broadcastEvent(data: object): void {
      publish(Response.json(data).body!)
    },
    async delete() {
      this.close()
      return bufferedFile.deleteFile()
    },
    async close() {
      console.log('[close] called!')
      await bufferedFile.close()
      activeStreams.forEach((sub) => sub.close())
      activeStreams.clear()
    },
    async subscribe() {
      console.log('[subscribe] called!')
      const streamBody = await createSubscription()
      return new Response(streamBody, {
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
