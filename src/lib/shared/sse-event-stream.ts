class ReadySignal {
  public readonly isReady: Promise<void>
  public ready!: () => void

  constructor() {
    this.isReady = new Promise((resolve) => {
      this.ready = () => { 
        this.ready = () => {}
        resolve()
      }
    })
  }
}

class Semaphore {
  private signal = Promise.resolve()

  public isReady() {
    return this.signal
  }

  public async acquireLock() {
    await this.signal
    const mutex = new ReadySignal()

    // chain previous signal with new signal
    this.signal = this.signal.then(() => mutex.isReady)

    return {
      releaseLock() {
        console.log('[Semaphore] relasing lock!')
        mutex.ready()
      },
      [Symbol.dispose]() {
        console.log('[Semaphore][Disposed] auto-relasing lock!')
        mutex.ready()
      },
    }
  }
}


function chunks(readableStream: ReadableStream<Uint8Array>) {
  const reader = readableStream.getReader()
  return {
    async *[Symbol.asyncIterator]() {
      try {
        do {
          const { value, done } = await reader.read()
          if (done) break
          yield value
        } while(true)
      } finally {}
    },
    [Symbol.dispose]() {
      reader.releaseLock()
    }
  }
}


/**
 * # Response Stream
 *
 * This class represents a response stream which can be written to by
 * external sources like responses.
 *
 */
class ResponseStream extends Response {
  private stream: TransformStream<Uint8Array, Uint8Array>
  private encoder = new TextEncoder()
  private eventId = 0

  // concurency flags
  private readonly readySignal = new ReadySignal()
  private readonly globalMutex = new Semaphore()

  constructor(headers: HeadersInit = {}) {
    // initialize transformer with headers
    const stream = new TransformStream<Uint8Array, Uint8Array>({
      start: () => {
        this.readySignal.ready()
      },
      transform: (chunk, controller) => {
        const eventPrefix = this.encoder.encode(`id: ${this.eventId++}\ndata: `)
        const eventSuffix = this.encoder.encode('\n\n')

        const totalLength =
          eventPrefix.length + chunk.length + eventSuffix.length
        const eventBytes = new Uint8Array(totalLength)

        eventBytes.set(eventPrefix, 0)
        eventBytes.set(chunk, eventPrefix.length)
        eventBytes.set(eventSuffix, eventPrefix.length + chunk.length)

        controller.enqueue(eventBytes)
      },
    })

    // return readable stream as text/event-stream
    super(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        ...headers,
      },
    })

    // store reference to write later
    this.stream = stream
  }

  public async aquireWriterMutex() {
    const mutex = await this.aquireLock()
    const writer = this.stream.writable.getWriter()

    return {
      async write(chunk: Uint8Array) {
        await writer.write(chunk)
      },
      releasLock() {
        mutex.releaseLock()
        writer.releaseLock()
      },
      [Symbol.dispose]() {
        mutex.releaseLock()
        writer.releaseLock()
      }
    }
  }

  public async aquireLock() {
    return this.globalMutex.acquireLock()
  }

  public async send<T extends {}>(obj: T) {
    const json = Response.json(obj).body!
    using writer = await this.aquireWriterMutex()
    using reader = chunks(json)
    for await (const chunk of reader) {
      await writer.write(chunk)
    }
  }

  public async pipe(...responses: Response[]) {
    using writer = await this.aquireWriterMutex()
    try {
      for await (const response of responses) {
        if (!response.body) continue

        // acquire read and write locks
        const reader = response.body.getReader()

        try {
          while (true) {
            const event = await reader.read()
            if (event.done) break
            await writer.write(event.value)
          }
        } finally {
          reader.releaseLock()
        }
      }
    } catch (e) {
      console.warn('Stream error:', e)
    }
  }
}

// example usage

export const GET = async (): Promise<Response> => {
  const stream = new ResponseStream()

  stream
    .pipe(
      Response.json({ data: 'Event #1' }),
      Response.json({ data: 'Event #2' }),
      Response.json({ data: 'Event #3' }),
      Response.json({ data: 'Event #4' }),
      Response.json({ data: 'Event #5' })
    )
    .catch(console.error)

  return stream
}
