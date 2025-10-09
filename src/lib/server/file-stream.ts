import { Mutex } from '@asleepace/mutex'
import { Try } from '@asleepace/try'
import { ServerSideEventEncoder } from './sse-encoder'
import { BufferedFile } from './buffered-file'

// --- constants ---

const KB = 1024
const MB = KB * KB
const GB = KB * MB

const BUFFER_SIZE = 5 * MB
const MAX_FILE_SIZE = 20 * MB
const MAX_AGE_24_HOURS = 24 * 60 * 60 * 1000

export type ByteChunk = Uint8Array<ArrayBuffer>
export type ByteStream = ReadableStream<ByteChunk>

declare const __clientIdBrand: unique symbol
export type ClientId = string & {
  [__clientIdBrand]: boolean
}

/** client ids are in the format 0x3AAB. */
function generateClientId(): ClientId {
  const bytes = crypto.getRandomValues(new Uint8Array(2))
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  return `0x${hex.toUpperCase()}` as ClientId
}

// --- stream subscriber ---

class StreamSubscriber {
  public id: string = generateClientId()
  public readonly createdAt = new Date()
  public updatedAt = new Date()
  public isAlive = true
 
  public get lastAliveInMs() {
    return Date.now() - +this.updatedAt
  }

  constructor(public readonly controller: ReadableByteStreamController) {}

  public canBeRemoved() {
    if (!this.isAlive) return true
    if (this.lastAliveInMs >= MAX_AGE_24_HOURS) return true
    return false
  }

  public write(chunk: ByteChunk) {
    try {
      this.controller.enqueue(chunk)
      this.updatedAt = new Date()
    } catch (e) {
      console.warn('[subscriber] error:', e)
      this.isAlive = false
      Try.catch(() => this.controller.error(e))
    }
  }

  public close() {
    if (!this.isAlive) return
    console.log('[subscriber] closed!')
    this.controller.close()
    this.isAlive = false
  }
}

/**
 * Store which manages stream subscribers.
 */
class StreamSubscriberStore extends Set<StreamSubscriber> {
  public maxAge = 24 * 60 * 60 * 1000

  public setMaxAge(maxAge: number) {
    this.maxAge = maxAge
  }

  get isEmpty(): boolean {
    return this.size === 0
  }

  public runGarbageCollector(): string[] {
    const closed: StreamSubscriber[] = this.filter((subsciber) => subsciber.canBeRemoved())
    closed.forEach((sub) => sub.close())
    return closed.map((sub) => sub.id)
  }

  public filter(callback: (subscriber: StreamSubscriber, index?: number) => boolean) {
    return Array.from(this).filter(callback)
  }

  public map<T>(callbackFn: (subscriber: StreamSubscriber, index?: number) => T): T[] {
    return Array.from(this).map(callbackFn)
  }

  public getPublisher = () => new WritableStream({
    write: (chunk) => this.publish(chunk)
  })

  public publish(chunk: ByteChunk) {
    for (const subscriber of this) {
      subscriber.write(chunk)
    }
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

  /** Persisted file with in-memory circular buffer. */
  const bufferedFile = new BufferedFile({
    fileName: `${options.streamId}.log`,
    maxFileSize: MAX_FILE_SIZE,
    bufferSize: BUFFER_SIZE,
  })

  /** Hydrate in-memory buffer with persisted data. */
  await bufferedFile.hydrateBuffer()
  await bufferedFile.getInfo()

  /** Set of all active client text/even-streams and helpers. */
  const activeStreams = new StreamSubscriberStore()

  /** NOTE: the callback is trigger when calling .broadcast() */
  const sse = new ServerSideEventEncoder((chunk) => activeStreams.publish(chunk))

  /** Metadata for session. */
  const meta = {
    streamId: options.streamId,
    createdAt: new Date(),
    updatedAt: new Date(),
    get clients() {
      return activeStreams.size
    },
  }

  /** Publishes incoming data to file + live subscribers. */
  async function publish(readableStream: ByteStream): Promise<void> {
    const lock = await mutex.acquireLock()
    try {
      await readableStream
        .pipeThrough(sse.getServerSideEventTransformer())
        .pipeThrough(bufferedFile.persistTransform())
        .pipeTo(activeStreams.getPublisher(), { preventClose: true })
    } finally {
      meta.updatedAt = new Date()
      lock.releaseLock()
    }
  }

  /** Called when no more active streams are left. */
  async function handleGarbageCollection() {
    // 1. Close in-active or stale streams
    const closedStreamIds = activeStreams.runGarbageCollector()

    // 2. Broadcast system message of closed streams.
    closedStreamIds.forEach((childId) => {
      sse.broadcastEvent({ name: 'client:closed', data: { childId }})
    })

    // 3. Close session if no more streams.
    if (!activeStreams.isEmpty) return
    console.log('[stream] garbage collection called!')
    sse.broadcastEvent('system', { name: 'stream:closed', data: { closedAt: new Date() }})
    await bufferedFile.close()
  }

  /**
   * Returns SSE stream with file history + live updates
   */
  async function createSubscription() {
    let subscriber: StreamSubscriber | undefined
    return new ReadableStream({
      type: 'bytes',
      async start(controller) {
        // instantiate a new subscription with a ref to the controller
        subscriber = new StreamSubscriber(controller)
        const clientId = subscriber.id

        try {
          // 1. pass first message with streamId and info and broadcast status
          const initialData = JSON.stringify({ clientId, ...meta })
          subscriber.write(sse.encode({ data: initialData }))
          sse.sendSystemEvent('client:connected', { clientId })

          // 2. hydrate stream
          for await (const chunk of bufferedFile.byteStream()) {
            subscriber.write(chunk.slice())
          }

          // 3. add to subscribers
          activeStreams.add(subscriber)
        } catch (e) {
          console.error('[subscribe] error:', e)
          Try.catch(() => controller.error(e))
        }
      },
      cancel() {
        console.log('[subscription] closed!')
        if (subscriber) activeStreams.delete(subscriber)
        handleGarbageCollection()
      },
    })
  }

  return {
    get id() { return options.streamId },
    /** publishes data to all streams and persists to file. */
    publish,
    /** broadcast an event to all streams & file. */
    broadcastEvent(data: object): void {
      publish(Response.json(data).body!)
    },
    /** broadcast a server-side event with type `"system"`. */
    broadcastSystemEvent(eventName: string, eventData?: object) {
      sse.sendSystemEvent(eventName, eventData)
    },
    /** closes all active clients and buffered file. */
    async close() {
      console.log('[close] called!')
      await bufferedFile.close()
      activeStreams.forEach((sub) => sub.close())
      activeStreams.clear()
    },
    /** closes all active clients and then deletes file (permanent). */
    async delete() {
      this.close()
      return bufferedFile.deleteFile()
    },
    /** returns a new text/event-stream subscribed to the session. */
    async subscribe(): Promise<Response> {
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
