import { Mutex } from '@asleepace/mutex'

const textEncoder = new TextEncoder()

function encode(chunk: string): Uint8Array {
  return textEncoder.encode(chunk)
}

const createID = () => `${crypto.randomUUID().split('-')[0]}`

const encodeStreamEvent = (message: {
  id: number
  event?: string
  data: Uint8Array
}) => {
  const evnt = message.event ? `\nevent: ${message.event}` : ''
  const head = encode(`id: ${message.id}${evnt}\ndata: `)
  const tail = encode(`\n\n`)
  const headLength = head.length
  const tailLength = tail.length
  const dataLength = message.data.length
  const buffer = new Uint8Array(headLength + tailLength + dataLength)
  buffer.set(head, 0)
  buffer.set(message.data, headLength)
  buffer.set(tail, headLength + dataLength)
  return buffer
}

//  ---  custom error definitions  ---

export class ErrorStream extends Error {}
export class ErrorStreamClosed extends ErrorStream {}
export class ErrorStreamStoreMaxCapacity extends ErrorStream {}
export class ErrorStreamAlreadyExists extends ErrorStream {}
export class ErrorStreamInvalidID extends ErrorStream {}

const STREAM_OPTIONS: StreamPipeOptions = {
  preventAbort: true,
  preventCancel: true,
  preventClose: true,
}

//  ---  custom stream class  ---

export class Stream2 {
  public static readonly MAX_CAPACITY = 64
  public static readonly store = new Map<string, Stream2>()

  static {
    setInterval(() => this.cleanup(), 15_000)
  }

  public static get isAtMaxCapacity(): boolean {
    this.cleanup()
    return this.store.size >= Stream2.MAX_CAPACITY
  }

  public static cleanup() {
    console.log(`[stream2] running cleanup (${this.store.size}) ...`)
    console.log(
      '[stream2] active:',
      [...this.store.values()].map((str) => str.info())
    )
    this.store.forEach((activeStream) => {
      console.log('[stream] cleanup checking:', activeStream.id)
      if (activeStream.isClosed) {
        this.end(activeStream)
      }
      if (activeStream.lastUpdated('mins') > 5) {
        this.end(activeStream)
      }
    })
  }

  public static end(stream: Stream2) {
    console.log('[stream2] closing stream:', stream.id)
    this.store.delete(stream.id)
  }

  public static has(streamId?: string | undefined | null): boolean {
    return Boolean(streamId && this.store.has(streamId))
  }

  public static get(streamId?: string | undefined | null): Stream2 | undefined {
    if (!streamId) return undefined
    if (!Stream2.store.has(streamId)) return undefined
    return Stream2.store.get(streamId)
  }

  public static new(): Stream2 {
    if (this.isAtMaxCapacity) throw new ErrorStreamStoreMaxCapacity()
    this.cleanup()
    const stream = new Stream2()
    this.store.set(stream.id, stream)
    stream.json({
      status: 'created',
      streamId: stream.id,
      timestamp: Date.now(),
    })
    return stream
  }

  public static use(streamId?: string | null | undefined): Stream2 {
    if (!streamId || streamId.length > 12) throw new ErrorStreamInvalidID()
    if (this.has(streamId)) throw new ErrorStreamAlreadyExists()
    this.cleanup()
    const stream = new Stream2(streamId)
    this.store.set(stream.id, stream)
    return stream
  }

  // Cleanup registry to handle garbage collected streams
  private static readonly cleanupRegistry = new FinalizationRegistry(
    (streamId: string) => {
      console.log(`[stream2] child stream garbage collected for ${streamId}`)
    }
  )

  // instance methods

  private readonly root: TransformStream
  private readonly mutex = Mutex.shared()

  private signals = new Set<AbortSignal>()

  private childStreams = new Set<WeakRef<ReadableStream>>()
  private controller?: TransformStreamDefaultController<any>
  private copyStream?: ReadableStream
  private createdAt = Date.now()
  private updatedAt = Date.now()

  private totalChildren = 0

  get isExpired(): boolean {
    const elapsed = (Date.now() - this.updatedAt) / 60_000 // minutes
    return elapsed > 30 // expires after 30 mins
  }

  get isStarted(): boolean {
    return Boolean(this.controller)
  }

  get isClosed(): boolean {
    return !this.controller
  }

  private message = {
    id: 0,
    event: undefined as undefined | string,
  }

  constructor(public readonly id = createID()) {
    this.root = new TransformStream({
      start: (controller) => {
        console.warn(`[stream:${this.id}] started!`)
        this.controller = controller
        this.comment('started')
        this.json({
          type: 'connected',
          data: { streamId: this.id },
        })
        this.json({
          type: 'system',
          html: `example usage: <code class="text-pink-400 rounded bg-white/5 px-2 py-1">curl -d "hello world" http://localhost:4321/${this.id}</code>`,
        })
      },
      transform: (chunk, controller) => {
        this.updatedAt = Date.now()
        controller.enqueue(
          encodeStreamEvent({
            id: this.message.id++,
            event: this.message.event,
            data: chunk,
          })
        )
      },
      flush: () => {
        console.warn(`[stream:${this.id}] closed!`)
        this.comment('closed')
        return this.close()
      },
    })

    // setup the copy stream
    this.copyStream = this.root.readable
    Stream2.cleanup()
  }

  public lastUpdated(time: 'secs' | 'mins' | 'hours' = 'mins') {
    const elapsedTime = Date.now() - this.updatedAt
    const seconds = elapsedTime / 1_000
    if (time === 'secs') return seconds
    if (time === 'mins') return seconds / 60
    return seconds / 3600
  }

  public comment(comment: string) {
    this.controller?.enqueue(`: ${comment}`)
  }

  public async json(chunk: any) {
    await this.text(JSON.stringify(chunk))
  }

  public async text(chunk: string) {
    await this.byte(encode(chunk))
  }

  public async byte(chunk: Uint8Array) {
    const lock = await this.mutex.acquireLock()
    const writer = this.root.writable.getWriter()
    try {
      await writer.ready
      await writer.write(chunk)
    } catch (e) {
      console.warn('[stream2] byte error:', e)
    } finally {
      writer.releaseLock()
      lock.releaseLock()
    }
  }

  /**
   * Pushes a readable stream to the writable stream.
   */
  public async push(readable: ReadableStream) {
    const lock = await this.mutex.acquireLock()
    try {
      if (this.isClosed) throw new ErrorStreamClosed()
      await readable.pipeTo(this.root.writable, STREAM_OPTIONS)
    } catch (e) {
      console.warn('[stream-error] push failed:', e)
    } finally {
      lock.releaseLock()
    }
  }

  /**
   * Returns a copy of the readable stream.
   */
  public pull() {
    if (!this.copyStream) throw new ErrorStreamClosed()
    const [nextStream, nextCopy] = this.copyStream?.tee()
    // Stream2.cleanupRegistry.register(nextStream, this.id)
    // this.childStreams.add(new WeakRef(nextStream))
    this.totalChildren += 1
    this.copyStream = nextCopy
    return nextStream
  }

  public async closeChildStreams() {
    try {
      console.log('[stream2] closing child streams:', this.childStreams)
      const closedPromises = [...this.childStreams.values()].map((child) =>
        child.deref()?.cancel('parent:closed')
      )
      await Promise.allSettled(closedPromises)
    } catch (e) {
      console.warn('[stream2] child cleanup error:', e)
    } finally {
      this.childStreams.clear()
    }
  }

  toReqponse(headersInit: HeadersInit = {}): Response {
    const duplicatedStream = this.pull()

    duplicatedStream
      .getReader()
      .closed.then(() => {
        console.log(`[stream:${this.id}] copy closed!`)
      })
      .catch(console.warn)

    const repsonse = new Response(this.pull(), {
      headers: {
        ...headersInit,
        'content-type': 'text/event-stream',
        'transfer-encoding': 'chunked',
        'x-accel-buffering': 'no',
        'x-stream-id': this.id,
      },
    })

    return repsonse
  }

  info() {
    return {
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      totalChildren: this.totalChildren,
    }
  }

  public async close() {
    if (this.isClosed) return
    const lock = await this.mutex.acquireLock()
    try {
      if (this.isClosed) return
      await this.json({ type: 'system', data: { status: 'closed' } })
      await this.closeChildStreams()
      this.controller?.terminate()
      await this.root.writable.close()
      await this.root.readable.cancel('closed')
    } catch (e) {
      console.warn('[stream2] error closing:', e)
    } finally {
      Stream2.store.delete(this.id)
      this.childStreams.clear()
      this.controller = undefined
      this.copyStream = undefined
      lock.releaseLock()
    }
  }
}
