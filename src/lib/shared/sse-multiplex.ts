import {
  StreamTask,
  type StreamTaskChunk,
  type StreamTaskConfig,
} from './sse-task'

class GloablEvents implements StreamTaskChunk {
  public isFinished = false
  public isReady = true

  private lastEventId: number = 0
  private events: string[] = []

  constructor() {}

  getEvents(): string[] {
    const evnets = this.events
    this.events = []
    return evnets
  }

  sendEvent({ type, data }: { type?: string; data: string | any }) {
    const event = type ? `event: ${type}\n` : ''
    const id = `id: ${this.id}\n`
    const prefix = id + event
    if (typeof data === 'string') {
      const message = prefix + `data: ${data}\n\n`
      this.events.push(message)
    } else {
      const message = prefix + `data: ${JSON.stringify(data)}\n\n`
      this.events.push(message)
    }
  }

  isGlobal() {
    return true
  }

  get id(): string {
    return String(this.lastEventId++)
  }
}

/**
 * # Multiplex Stream
 *
 * A multiplexed stream which can have multiple readers and writers,
 * the client can subscribe the the `text/event-stream` then schedule
 * jobs that can be run async.
 */
export class MultiplexStream {
  // instance properties

  private readonly reader: ReadableStream
  private writer: WritableStream | undefined
  private text: TextEncoder = new TextEncoder()

  readonly streamId: string

  private tasks: StreamTaskChunk[] = [new GloablEvents()]

  public isOpened: boolean = false

  constructor(streamId: string) {
    this.streamId = streamId
    this.reader = new ReadableStream<Uint8Array>({
      start: (controller) => {
        console.log('[sse-multiplex] start...')
        this.isOpened = true
        this.sendEvent({ data: { streamId } })
        let writeId = 0
        this.writer = new WritableStream({
          write: (chunk) => {
            const data = JSON.parse(new TextDecoder().decode(chunk))
            console.log('[sse-multiplex] writeable chunk:', chunk)
            const text = this.text.encode(`id: ${++writeId}\ndata: ${data}\n\n`)
            controller.enqueue(text)
          },
        })
      },
      pull: (controller) => {
        console.log('[sse-multiplex] pull:', this.tasks)
        this.pullTasks(controller)
      },
      cancel: () => {
        console.log('[sse-multiplex] cancelled!')
        this.isOpened = false
      },
    })
  }

  sendEvent(event: { data: any; type?: string }) {
    const globalEvents = this.tasks.at(0)
    if (globalEvents instanceof GloablEvents) {
      globalEvents.sendEvent(event)
    }
  }

  private pullTasks(controller: ReadableStreamDefaultController<Uint8Array>) {
    for (const task of this.tasks) {
      if (!task.isReady) continue
      task.getEvents().forEach((taskEvent) => {
        console.log('[task] event:', taskEvent)
        const message = this.text.encode(taskEvent)
        controller.enqueue(message)
      })
    }
    this.cleanupTasks()
  }

  public cleanupTasks() {
    this.tasks = this.tasks.filter((task) => !task.isFinished)
  }

  public addTask<T>(config: StreamTaskConfig<T>) {
    const task = new StreamTask(config)
    this.tasks.push(task)
    task.start().catch((e) => {
      console.warn('[MultiplexStream] error:', e)
    })
    return task
  }

  public getTask(taskId: string) {
    return this.tasks.find((task) => task.id === taskId)
  }

  public async pipeRequest(request: Request) {
    try {
      if (!request.body) throw new Error('Missing request body!')
      if (!this.writer) throw new Error('Missing writer')
      if (this.writer.locked)
        await request.body.pipeTo(this.writer, {
          preventAbort: true,
          preventCancel: true,
          preventClose: true,
        })
      await request.body.cancel()
    } catch (e) {
      console.warn('[sse-multiplex] error:', e)
    } finally {
      await request.body?.cancel()
    }
  }

  toResponse() {
    console.log('[sse-multiplex] to response:', this.reader.locked)
    return new Response(this.reader, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'X-Stream-ID': this.streamId,
      },
    })
  }
}
