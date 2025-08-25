/**
 * Basic Stream Task Chunk
 */
export interface StreamTaskChunk {
  id: string | undefined
  isReady: boolean
  isFinished: boolean
  getEvents(): string[]
  start?: () => Promise<void>
}

export interface StreamTaskConfig<T = any> {
  taskId: string
  work: () => Promise<ReadableStream<Uint8Array>>

  // Encoding configuration
  encoder?: {
    decode: (chunk: Uint8Array) => T
    encode: (data: T) => string
  }

  // Streaming behavior
  waitUntilFinished?: boolean
  chunkSize?: number

  // Event configuration
  eventPrefix?: string
  includeProgress?: boolean
}

export type StreamTaskStatus =
  | 'pending'
  | 'running'
  | 'streaming'
  | 'completed'
  | 'error'

export interface StreamTaskEvent {
  id: number
  event: string
  data: string
  timestamp: number
}

export class StreamTask<T = string> implements StreamTaskChunk {
  public readonly id: string
  public status: StreamTaskStatus = 'pending'
  public error?: Error
  public progress = { current: 0, total: 0 }

  private config: Required<StreamTaskConfig<T>>
  private stream?: ReadableStream<Uint8Array>
  private reader?: ReadableStreamDefaultReader<Uint8Array>
  private buffer: T[] = []
  private eventQueue: StreamTaskEvent[] = []
  private eventIdCounter = 0

  constructor(config: StreamTaskConfig<T>) {
    this.id = config.taskId
    this.config = {
      encoder: {
        decode: (chunk) => new TextDecoder().decode(chunk) as T,
        encode: (data) => String(data),
      },
      waitUntilFinished: false,
      chunkSize: 1024 * 8, // 8KB chunks
      eventPrefix: config.taskId,
      includeProgress: false,
      ...config,
    }
  }

  async start(): Promise<void> {
    if (this.status !== 'pending') {
      throw new Error(`Task ${this.id} already started`)
    }

    try {
      this.status = 'running'
      this.queueEvent('started', '')

      // Execute the work function
      this.stream = await this.config.work()
      this.reader = this.stream.getReader()

      this.status = 'streaming'
      this.queueEvent('streaming', '')

      if (this.config.waitUntilFinished) {
        await this.consumeEntireStream()
      } else {
        // Start consuming in background
        this.consumeStreamChunks().catch((err) => this.handleError(err))
      }
    } catch (error) {
      this.handleError(error)
    }
  }

  private async consumeEntireStream(): Promise<void> {
    while (true) {
      const { done, value } = await this.reader!.read()

      if (done) break

      if (value) {
        const decoded = this.config.encoder.decode(value)
        this.buffer.push(decoded)
        this.progress.current += value.length

        if (this.config.includeProgress) {
          this.queueEvent('progress', JSON.stringify(this.progress))
        }
      }
    }

    this.status = 'completed'
    this.queueEvent('completed', '')
  }

  private async consumeStreamChunks(): Promise<void> {
    while (this.status === 'streaming') {
      const { done, value } = await this.reader!.read()

      if (done) {
        this.status = 'completed'
        this.queueEvent('completed', '')
        break
      }

      if (value) {
        const decoded = this.config.encoder.decode(value)
        this.buffer.push(decoded)
        this.progress.current += value.length

        if (this.config.includeProgress) {
          this.queueEvent('progress', JSON.stringify(this.progress))
        }
      }
    }
  }

  private handleError(error: unknown): void {
    this.status = 'error'
    this.error = error instanceof Error ? error : new Error(String(error))
    this.queueEvent('error', this.error.message)
  }

  private queueEvent(type: string, data: string): void {
    this.eventQueue.push({
      id: ++this.eventIdCounter,
      event: `${this.config.eventPrefix}-${type}`,
      data,
      timestamp: Date.now(),
    })
  }

  // Check if task has data ready to be consumed
  get isReady(): boolean {
    return this.buffer.length > 0 || this.eventQueue.length > 0
  }

  // Check if task is finished (completed or error)
  get isFinished(): boolean {
    return this.status === 'completed' || this.status === 'error'
  }

  // Consume available data (non-blocking)
  consumeData(): { events: StreamTaskEvent[]; data: T[] } {
    const events = [...this.eventQueue]
    const data = [...this.buffer]

    this.eventQueue.length = 0
    this.buffer.length = 0

    return { events, data }
  }

  // Get encoded SSE events for immediate streaming
  getEvents(): string[] {
    const { events, data } = this.consumeData()
    const sseEvents: string[] = []

    // Add queued events
    for (const event of events) {
      sseEvents.push(
        `id: ${event.id}\n` +
          `event: ${event.event}\n` +
          `data: ${event.data}\n\n`
      )
    }

    // Add data events
    for (const item of data) {
      const encoded = this.config.encoder.encode(item)
      sseEvents.push(
        `id: ${++this.eventIdCounter}\n` +
          `event: ${this.config.eventPrefix}-data\n` +
          `data: ${encoded}\n\n`
      )
    }

    return sseEvents
  }

  async cleanup(): Promise<void> {
    if (this.reader) {
      await this.reader.cancel()
      this.reader.releaseLock()
    }
  }
}
