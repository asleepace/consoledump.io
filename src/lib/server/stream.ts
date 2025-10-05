import { Mutex } from '@asleepace/mutex'
import { Timestamp } from './timestamp'
import { ResponseStream } from './response-stream'

const textEncoder = new TextEncoder()

function encode(chunk: string): Uint8Array {
  return textEncoder.encode(chunk)
}

const createID = () => `${crypto.randomUUID().split('-')[0]}`

const encodeStreamEvent = (message: { id: number; event?: string; data: Uint8Array }) => {
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

//  ---  helper methods ---

function MessageExample(params: { id: string }) {
  return {
    type: 'system',
    html: `example usage (bash): <code class="text-pink-400 rounded bg-white/5 px-2 py-1">curl -d "hello world" https://consoledump.io/${params.id}</code>`,
  }
}

function MessageExampleJS(params: { id: string }) {
  return {
    type: 'system',
    html: `example usage (js): <code class="text-pink-400 rounded bg-white/5 px-2 py-1">const dump = (...args) => fetch('https://consoledump.io/${params.id}',{method:'POST', body:JSON.stringify(args)})</code>`,
  }
}

function MessageConnected(params: { id: string }) {
  return {
    type: 'connected',
    data: { streamId: params.id },
  }
}

function MessageClientConnected(params: { id: string }) {
  return {
    type: 'system',
    html: `<p class="text-green-400">client (${params.id}) connected!</p>`,
  }
}

function MessageDisconnected(params: { totalChildren: number }) {
  return {
    type: 'system',
    html: `<p class="text-red-400">client (${params.totalChildren}) disconnected...</p>`,
  }
}

//  ---  custom error definitions  ---

export class ErrorStream extends Error {}
export class ErrorStreamClosed extends ErrorStream {}
export class ErrorStreamStoreMaxCapacity extends ErrorStream {}
export class ErrorStreamAlreadyExists extends ErrorStream {}
export class ErrorStreamInvalidID extends ErrorStream {}
export class ErrorStreamNotFound extends ErrorStream {}

const STREAM_OPTIONS: StreamPipeOptions = {
  /** If this is set to true, errors in the source ReadableStream will no longer abort the destination WritableStream. */
  preventAbort: false,
  /** If this is set to true, errors in the destination WritableStream will no longer cancel the source ReadableStream. */
  preventCancel: false,
  /** If this is set to true, closing the source ReadableStream will no longer cause the destination WritableStream to be closed. */
  preventClose: true,
}

//  ---  custom stream class  ---

export class Stream2 {
  public static readonly MAX_CAPACITY = 512 // Max number of streams (~10.2 GB at 20 MB per stream)
  public static readonly MAX_BYTES_IN_MB = 20 * 1024 * 1024 // 20 MB
  public static readonly MAX_AGE = 24 * 60 * 60 * 1000 // 24 hours
  public static readonly MIN_KEEP_ALIVE = 1000 * 25 // 25secs

  public static readonly store = new Map<string, Stream2>()

  public static get isAtMaxCapacity(): boolean {
    this.cleanup()
    return this.store.size >= Stream2.MAX_CAPACITY
  }

  public static cleanup() {
    console.log('[stream:store] active streams:', this.store.size, [...this.store.keys()])
    this.store.forEach((stream) => {
      if (stream.canBeClosed || stream.cleanup()) {
        this.store.delete(stream.id)
        stream.close().catch(console.warn)
      }
    })
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
    console.log('[stream] creating new stream!')
    this.cleanup()
    const stream = new Stream2()
    this.store.set(stream.id, stream)
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
  private static readonly cleanupRegistry = new FinalizationRegistry((childId: string) => {
    console.log(`[stream:store] garbage collection:`, { childId })
    const [streamId] = childId.split('-')
    const parentStream = this.store.get(streamId)
    parentStream?.onChildClosed(childId)
    parentStream?.cleanup()
    this.cleanup()
  })

  // instance methods

  private readonly root: TransformStream
  private readonly mutex = Mutex.shared()
  private controller?: TransformStreamDefaultController<any>
  private originalStream?: ReadableStream
  public readonly timestamp = new Timestamp({ maxAge: Stream2.MAX_AGE })
  public childStreams = new Map<string, WeakRef<ResponseStream>>()
  public totalBytes = 0
  public childId = 0

  get isStarted(): boolean {
    return Boolean(this.controller)
  }

  get isExpired(): boolean {
    return this.timestamp.isExpired
  }

  get isClosed(): boolean {
    return !this.controller
  }

  get isOutOfMemory(): boolean {
    return this.totalBytes >= Stream2.MAX_BYTES_IN_MB
  }

  get canBeClosed() {
    return this.isExpired || this.isClosed || this.isOutOfMemory || this.childStreams.size === 0
  }

  private message = {
    id: 1,
    event: undefined as undefined | string,
  }

  constructor(public readonly id = createID()) {
    this.root = new TransformStream<Uint8Array>({
      start: (controller) => {
        this.controller = controller
        this.json(MessageConnected({ id: this.id }))
        this.json(MessageExample({ id: this.id }))
        this.json(MessageExampleJS({ id: this.id }))
      },
      transform: (chunk, controller) => {
        this.timestamp.update()
        controller.enqueue(
          encodeStreamEvent({
            id: this.message.id++,
            event: this.message.event,
            data: chunk,
          })
        )
        this.totalBytes += chunk.length
      },
      flush: () => {
        console.warn(`[stream:${this.id}:root] closed!`)
        this.close()
      },
    })

    // setup the original stream which will be copied
    this.originalStream = this.root.readable
  }

  public comment(comment: string) {
    this.controller?.enqueue(`: ${comment}\n\n`)
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

  public copy(): ReadableStream<Uint8Array> {
    if (this.isClosed || !this.originalStream) throw new ErrorStreamClosed()
    const [copy, original] = this.originalStream.tee()
    this.originalStream = original
    return copy
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
      console.warn(`[stream:${this.id}:root] push failed:`, e)
    } finally {
      lock.releaseLock()
    }
  }

  /**
   * Returns a copy of the readable stream.
   */
  public pull(): ResponseStream {
    if (this.isClosed || !this.originalStream) throw new ErrorStreamClosed()
    const [nextBroadcast, nextOriginal] = this.originalStream.tee()
    const childStream = new ResponseStream({
      keepAliveInterval: Stream2.MIN_KEEP_ALIVE,
      maxAge: Stream2.MAX_AGE,
      readable: nextBroadcast,
      parentId: this.id,
      id: ++this.childId,
    })
    this.originalStream = nextOriginal
    this.childStreams.set(childStream.tagName, new WeakRef(childStream))
    this.json(MessageClientConnected({ id: String(this.childId) }))
    Stream2.cleanupRegistry.register(childStream, childStream.tagName)
    Stream2.cleanup()
    return childStream
  }

  /**
   * Callback triggered when a child closes.
   */
  public onChildClosed(childId: string) {
    console.log(`[stream:${this.id}] onChildClosed:`, childId)
    const childStream = this.childStreams.get(childId)
    if (!childStream) return console.log('no child found...')
    this.childStreams.delete(childId)
    this.json(MessageDisconnected({ totalChildren: this.childStreams.size }))
    childStream.deref()?.close()
    if (this.childStreams.size === 0) {
      this.close().catch(console.warn)
    }
  }

  public info() {
    return {
      id: this.id,
      totalBytes: this.totalBytes,
      children: this.childStreams.size,
      lastChildId: this.childId,
    }
  }

  public cleanup(): boolean {
    if (this.canBeClosed) return true
    this.childStreams.forEach((child, key) => {
      const streamRef = child.deref()
      if (streamRef?.keepAlive()) return
      streamRef?.close()
      this.childStreams.delete(key)
    })
    return this.childStreams.size === 0
  }

  public async close() {
    if (this.isClosed) return
    console.log('[stream] closing stream:', this.id)
    const lock = await this.mutex.acquireLock()
    try {
      if (this.isClosed) return
      console.warn(`[stream:${this.id}] closing!`)
      this.controller?.terminate()
      this.childStreams.forEach((child) => {
        child.deref()?.close()
      })
      await this.root.writable.close()
    } catch (e) {
      console.warn('[stream2] error closing:', e)
    } finally {
      Stream2.store.delete(this.id)
      this.childStreams.clear()
      this.controller = undefined
      this.originalStream = undefined
      lock.releaseLock()
      Stream2.cleanup()
    }
  }
}
