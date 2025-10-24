declare const StreamBrand: unique symbol

type Ints = Uint8Array<ArrayBufferLike>
type StreamableStatus = 'init' | 'open' | 'closed'
type StreamId = string & {
  [StreamBrand]: 'v1'
}

function createId() {
  const random = crypto.getRandomValues(new Uint8Array(8))
  const idString = Array.from(random)
    .map((item) => item.toString(36))
    .join('')
  return idString as StreamId
}

function id(idString: string | StreamId): StreamId {
  return idString as StreamId
}

/**
 * A small wrapper around a Readable Stream which exposes the underlying controller.
 */
class ChildStream extends ReadableStream<Ints> {
  public controller?: ReadableStreamDefaultController

  get connected() {
    return Boolean(this.controller)
  }

  constructor(public cleanup: () => void) {
    super({
      start: (controller) => {
        this.controller = controller
      },
      cancel: () => {
        this.controller = undefined
        this.cleanup()
      },
    })
  }

  public enqueue(chunk: Ints) {
    this.controller?.enqueue(chunk)
  }

  public close() {
    this.controller?.close()
  }
}

/**
 * The core streamable class supports multiple readers and a single write
 * source which propogates to all children.
 */
class Streamable {
  private writable: WritableStream<Ints>
  private children: (ChildStream | null)[] = []
  private writeQueue = Promise.resolve()

  private state = {
    status: 'init' as StreamableStatus,
  }

  get status() {
    return this.state.status
  }

  get count() {
    return this.children.length
  }

  constructor(public readonly id: StreamId) {
    this.writable = new WritableStream({
      start: () => {
        this.state.status = 'open'
      },
      write: (chunk) => {
        for (const childStream of this.children) {
          if (!childStream) continue
          childStream.enqueue(chunk)
        }
      },
      close: () => {
        this.state.status = 'closed'
      },
    })
  }

  public subscribe(): ChildStream {
    const child = new ChildStream(() => {
      const idx = this.children.findIndex((stream) => Object.is(stream, child))
      if (idx !== -1) {
        this.children[idx] = null
      }
    })
    this.children.push(child)
    return child
  }

  public close(): void {
    try {
      if (this.status !== 'open') return console.warn('stream already closed!')
      this.state.status = 'closed'
      this.children.forEach((child) => child?.close())
      this.writable.abort('closed')
    } catch (e) {
      console.warn(e)
    } finally {
      this.children.length = 0
    }
  }

  async transaction(
    operation: (writer: WritableStreamDefaultWriter<Ints>) => Promise<void>
  ) {
    await this.writeQueue
    const writer = this.writable.getWriter()
    try {
      await operation(writer)
    } finally {
      writer.releaseLock()
    }
  }

  async bytes(chunk: Ints) {
    const promise = await this.transaction((writer) => writer.write(chunk))
    this.writeQueue = this.writeQueue
      .then(() => promise)
      .catch((e) => console.warn(e))
  }
}

/**
 * A memory aware map used to manage collections.
 */
class Streams {
  public readonly items = new Map<StreamId, WeakRef<Streamable>>()

  public readonly defer = new FinalizationRegistry((streamIdRef: StreamId) => {
    if (!this.items.has(streamIdRef)) {
      console.warn('[cleanup] key not found:', streamIdRef)
      return
    }
    const streamRef = this.get(streamIdRef)
    streamRef?.close()
    this.items.delete(streamIdRef)
  })

  get size() {
    return this.items.size
  }

  public has(id: StreamId): boolean
  public has(stream: Streamable): boolean
  public has(key: StreamId | Streamable): boolean {
    if (typeof key === 'string') return Boolean(this.get(key))
    if (typeof key === 'object' && 'id' in key) {
      return Boolean(this.get(key.id))
    }
    return false
  }

  public get(streamId: StreamId): Streamable | undefined {
    return this.items.get(streamId)?.deref?.()
  }

  public ref(stream: Streamable): WeakRef<Streamable> {
    const weakRef = new WeakRef(stream)
    this.defer.register(stream, stream.id, weakRef)
    return weakRef
  }

  public add(stream: Streamable): void {
    const streamRef = this.ref(stream)
    this.items.set(stream.id, streamRef)
  }

  public delete(streamId: string | StreamId) {
    return this.items.delete(streamId as StreamId)
  }

  *[Symbol.iterator](): Generator<Streamable> {
    for (const [_id, streamRef] of this.items) {
      const stream = streamRef.deref?.()
      if (!stream) continue
      yield stream
    }
  }
}

/**
 * Helper which creates a new HTTP response from a stream.
 */
function resp(stream: Streamable) {
  return new Response(stream.subscribe(), {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
    },
  })
}

async function GET(ctx: { url: URL; streams: Streams }): Promise<Response> {
  const id = ctx.url.pathname.slice(1) as StreamId

  // if stream exists, clone and send response
  if (ctx.streams.has(id)) {
    const stream = ctx.streams.get(id)!
    return resp(stream)
  }

  // otherwise, create a new instance
  const stream = new Streamable(id)
  ctx.streams.add(stream)
  return resp(stream)
}
