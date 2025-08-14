/**
 * Duplex Stream
 *
 * Provides two-way communication between two different streams.
 */
export class DuplexStream<T = Uint8Array> {
  private writer: WritableStream<T> | undefined
  private reader: ReadableStream<T> | undefined
  private lastId: number = 0

  private writableController: WritableStreamDefaultController | undefined
  private readableController: ReadableStreamDefaultController<T> | undefined

  // Internal state
  private _isReadableClosed = false
  private _isWritableClosed = false
  private _buffer: Array<{ id: number; data: T }> = []

  constructor() {
    // Create readable stream
    this.reader = new ReadableStream({
      start: (controller) => {
        this.readableController = controller
      },
      pull: (controller) => {
        // Emit buffered data when pulled
        this._flushBuffer()
      },
      cancel: (reason) => {
        this._isReadableClosed = true
        this._buffer = []
        console.log("Readable cancelled:", reason)
      },
    })

    // Create writeable stream
    this.writer = new WritableStream({
      start: (controller) => {
        this.writableController = controller
      },
      write: (chunk) => {
        this._handleWrite(chunk)
      },
      close: () => {
        this._isWritableClosed = true
        this._flushBuffer()
        this._closeReadableIfReady()
      },
      abort: (reason) => {
        this._isWritableClosed = true
        this._errorReadable(reason)
      },
    })
  }

  // Public getters for the streams
  get readable(): ReadableStream<T> {
    if (!this.reader) {
      throw new Error("Readable stream has been destroyed")
    }
    return this.reader
  }

  get writable(): WritableStream<T> {
    if (!this.writer) {
      throw new Error("Writable stream has been destroyed")
    }
    return this.writer
  }

  // State getters
  get isReadableClosed(): boolean {
    return this._isReadableClosed
  }

  get isWritableClosed(): boolean {
    return this._isWritableClosed
  }

  get isClosed(): boolean {
    return this._isReadableClosed && this._isWritableClosed
  }

  // Get readers and writers
  getReader(): ReadableStreamDefaultReader<T> {
    return this.readable.getReader()
  }

  getWriter(): WritableStreamDefaultWriter<T> {
    return this.writable.getWriter()
  }

  // Private methods for handling internal logic
  private _handleWrite(chunk: T): void {
    const id = ++this.lastId

    // Buffer the chunk with an ID
    this._buffer.push({ id, data: chunk })

    // Try to flush immediately
    this._flushBuffer()
  }

  private _flushBuffer(): void {
    if (!this.readableController || this._isReadableClosed) {
      return
    }

    // Emit all buffered chunks
    while (this._buffer.length > 0) {
      const item = this._buffer.shift()!
      try {
        this.readableController.enqueue(item.data)
      } catch (error) {
        // If enqueue fails (stream closed), stop flushing
        break
      }
    }
  }

  private _closeReadableIfReady(): void {
    if (
      this._isWritableClosed &&
      this._buffer.length === 0 &&
      this.readableController &&
      !this._isReadableClosed
    ) {
      this.readableController.close()
      this._isReadableClosed = true
    }
  }

  private _errorReadable(reason: any): void {
    if (this.readableController && !this._isReadableClosed) {
      this.readableController.error(reason)
      this._isReadableClosed = true
    }
  }

  // Utility methods for easier usage
  async write(chunk: T): Promise<void> {
    const writer = this.getWriter()
    try {
      await writer.write(chunk)
    } finally {
      writer.releaseLock()
    }
  }

  async read(): Promise<ReadableStreamReadResult<T>> {
    const reader = this.getReader()
    try {
      return await reader.read()
    } finally {
      reader.releaseLock()
    }
  }

  // Piping methods
  pipeTo(
    destination: WritableStream<T>,
    options?: StreamPipeOptions
  ): Promise<void> {
    return this.readable.pipeTo(destination, options)
  }

  pipeThrough<U>(
    transform: ReadableWritablePair<U, T>,
    options?: StreamPipeOptions
  ): ReadableStream<U> {
    return this.readable.pipeThrough(transform, options)
  }

  // Transform the duplex stream
  transform<U>(transformer: (chunk: T) => U | Promise<U>): DuplexStream<U> {
    const newDuplex = new DuplexStream<U>()

    // Pipe writes through transformer to new duplex
    this.readable.pipeTo(
      new WritableStream<T>({
        async write(chunk) {
          const transformed = await transformer(chunk)
          await newDuplex.write(transformed)
        },
        close() {
          newDuplex.closeWritable()
        },
        abort(reason) {
          newDuplex.abort(reason)
        },
      })
    )

    return newDuplex
  }

  // Close methods
  async closeWritable(): Promise<void> {
    if (this.writer && !this._isWritableClosed) {
      await this.writer.close()
    }
  }

  closeReadable(): void {
    if (this.readableController && !this._isReadableClosed) {
      this.readableController.close()
      this._isReadableClosed = true
    }
  }

  async close(): Promise<void> {
    await this.closeWritable()
    this.closeReadable()
  }

  // Abort both streams
  async abort(reason?: any): Promise<void> {
    const promises: Promise<void>[] = []

    if (this.writer && !this._isWritableClosed) {
      promises.push(this.writer.abort(reason))
    }

    if (!this._isReadableClosed) {
      this._errorReadable(reason)
    }

    await Promise.allSettled(promises)
  }

  // Destroy and cleanup
  destroy(): void {
    this._buffer = []
    this.reader = undefined
    this.writer = undefined
    this.readableController = undefined
    this.writableController = undefined
    this._isReadableClosed = true
    this._isWritableClosed = true
  }

  // Create a tee of the readable side
  tee(): [ReadableStream<T>, ReadableStream<T>] {
    return this.readable.tee()
  }

  // Static factory methods
  static from<T>(iterable: Iterable<T>): DuplexStream<T> {
    const duplex = new DuplexStream<T>() // Write all items from iterable
    ;(async () => {
      try {
        for (const item of iterable) {
          await duplex.write(item)
        }
        await duplex.closeWritable()
      } catch (error) {
        await duplex.abort(error)
      }
    })()

    return duplex
  }

  static fromReadableStream<T>(readable: ReadableStream<T>): DuplexStream<T> {
    const duplex = new DuplexStream<T>()

    // Pipe readable to duplex writable
    readable.pipeTo(duplex.writable).catch((error) => {
      duplex.abort(error)
    })

    return duplex
  }

  static echo<T>(): DuplexStream<T> {
    const duplex = new DuplexStream<T>()

    // Echo writes to reads
    duplex.readable.pipeTo(duplex.writable).catch((error) => {
      console.error("Echo duplex error:", error)
    })

    return duplex
  }

  // Async iterator support
  async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
    const reader = this.getReader()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        yield value
      }
    } finally {
      reader.releaseLock()
    }
  }
}
