/**
 * # Multiplex Stream
 *
 *
 */
export class MultiplexStream<T extends Uint8Array = Uint8Array> {
  // instance properties

  private readonly reader: ReadableStream
  private readonly writer: WritableStream

  private controller: ReadableStreamDefaultController<Uint8Array> | undefined
  private dispatcher: WritableStreamDefaultController | undefined

  private buffer: Array<{ id: number; data: T }> = []

  public readonly streamId: string
  private lastEventId: number = 0

  constructor(streamId: string) {
    this.streamId = streamId
    this.reader = new ReadableStream({
      start: (controller) => {
        this.controller = controller
      },
      pull: (controller) => {
        const txt = new TextEncoder()
        for (const chunk of this.buffer) {
          if (!this.controller) break
          const msg = txt.encode(`id: ${chunk.id}\ndata: ${chunk.data}\n\n`)
          controller.enqueue(msg)
        }
        this.buffer.length = 0
      },
      cancel: () => {
        this.controller = undefined
      },
    })

    this.writer = new WritableStream({
      start: (controller) => {
        this.dispatcher = controller
      },
      write: (chunk) => {
        this.writeBuffer(chunk)
      },
      close: () => {
        this.dispatcher = undefined
      },
    })
  }

  private writeBuffer(chunk: T) {
    this.buffer.push({ id: ++this.lastEventId, data: chunk })
  }

  toResponse() {
    const [streamA, streamB] = this.reader.tee()
    return new Response(streamA, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'X-Stream-ID': this.streamId,
      },
    })
  }

  async pipe(stream: ReadableStream) {
    await stream.pipeTo(
      new WritableStream({
        write: (chunk) => {
          const sync = this.writer.getWriter()
          sync.write(chunk)
        },
        close: () => {},
        abort: () => {},
      })
    )
  }
}
