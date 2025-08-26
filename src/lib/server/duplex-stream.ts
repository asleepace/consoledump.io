/**
 * A stream which provides methods for both pushing and pulling data,
 * all from a single shared buffer with maximum efficiency.
 */
export class DuplexStream {
  private buffer: Uint8Array
  private readers: Set<{
    controller: ReadableByteStreamController
    readPosition: number
  }> = new Set()
  private writePosition = 0
  private totalWritten = 0

  public writable: WritableStream<Uint8Array>
  public encoder = new TextEncoder()

  constructor(private bufferSize = 64 * 1024) {
    this.buffer = new Uint8Array(bufferSize)
    this.writable = new WritableStream({
      start: () => {
        console.log('[writable] started!')
      },
      write: (chunk) => {
        this.writeToBuffer(chunk)
        this.notifyReaders()
      },
    })
  }

  private writeToBuffer(chunk: Uint8Array): void {
    const chunkLength = chunk.length
    const bufferSize = this.bufferSize
    let writePos = this.writePosition

    // Handle case where chunk is larger than remaining buffer space
    if (writePos + chunkLength <= bufferSize) {
      // Simple case: chunk fits without wrapping
      this.buffer.set(chunk, writePos)
      this.writePosition = writePos + chunkLength
    } else {
      // Chunk wraps around buffer
      const firstPartSize = bufferSize - writePos
      const secondPartSize = chunkLength - firstPartSize

      // Write first part to end of buffer
      this.buffer.set(chunk.subarray(0, firstPartSize), writePos)

      // Write second part to beginning of buffer
      this.buffer.set(chunk.subarray(firstPartSize), 0)

      this.writePosition = secondPartSize
    }

    this.totalWritten += chunkLength
  }

  private notifyReaders(): void {
    if (this.readers.size === 0) return // Early exit if no readers

    // Use iterator to avoid creating array
    for (const reader of this.readers) {
      try {
        this.pushDataToReader(reader)
      } catch (error) {
        this.readers.delete(reader)
      }
    }
  }

  private pushDataToReader(reader: {
    controller: ReadableByteStreamController
    readPosition: number
  }): void {
    const { controller } = reader
    const readPos = reader.readPosition
    const writePos = this.writePosition

    // Early exit if no new data
    if (readPos === writePos) return

    // Handle BYOB request if available
    if (controller.byobRequest) {
      const view = controller.byobRequest.view
      if (view) {
        const bytesToRead = this.getAvailableBytesCount(readPos, writePos)
        if (bytesToRead > 0) {
          const bytesToCopy = Math.min(bytesToRead, view.byteLength)
          this.copyDataToView(
            readPos,
            bytesToCopy,
            new Uint8Array(view.buffer, view.byteOffset, bytesToCopy)
          )
          reader.readPosition = (readPos + bytesToCopy) % this.bufferSize
          controller.byobRequest.respond(bytesToCopy)
        }
      }
    } else {
      // Create zero-copy view for non-BYOB readers
      const dataView = this.createDataView(readPos, writePos)
      if (dataView.length > 0) {
        controller.enqueue(dataView)
        reader.readPosition = writePos
      }
    }
  }

  private getAvailableBytesCount(readPos: number, writePos: number): number {
    if (readPos === writePos) return 0
    if (readPos < writePos) return writePos - readPos
    return this.bufferSize - readPos + writePos
  }

  private createDataView(readPos: number, writePos: number): Uint8Array {
    if (readPos === writePos) return new Uint8Array(0)

    if (readPos < writePos) {
      // Simple case: return subarray view (zero-copy)
      return this.buffer.subarray(readPos, writePos)
    } else {
      // Buffer has wrapped: need to combine two parts
      const firstPartSize = this.bufferSize - readPos
      const secondPartSize = writePos
      const totalSize = firstPartSize + secondPartSize

      // Only create new array when buffer wraps (unavoidable)
      const result = new Uint8Array(totalSize)
      result.set(this.buffer.subarray(readPos), 0)
      result.set(this.buffer.subarray(0, writePos), firstPartSize)
      return result
    }
  }

  private copyDataToView(
    readPos: number,
    bytesToCopy: number,
    targetView: Uint8Array
  ): void {
    if (readPos + bytesToCopy <= this.bufferSize) {
      // Simple case: no wrapping
      targetView.set(this.buffer.subarray(readPos, readPos + bytesToCopy))
    } else {
      // Wrapping case
      const firstPartSize = this.bufferSize - readPos
      const secondPartSize = bytesToCopy - firstPartSize

      targetView.set(this.buffer.subarray(readPos), 0)
      targetView.set(this.buffer.subarray(0, secondPartSize), firstPartSize)
    }
  }

  private getHistoricalData(): Uint8Array {
    const bytesInBuffer = Math.min(this.totalWritten, this.bufferSize)

    if (bytesInBuffer === 0) return new Uint8Array(0)

    if (this.totalWritten <= this.bufferSize) {
      // Buffer hasn't wrapped yet, return zero-copy view
      return this.buffer.subarray(0, this.writePosition)
    } else {
      // Buffer has wrapped, create view of data in chronological order
      const firstPartSize = this.bufferSize - this.writePosition
      const secondPartSize = this.writePosition

      const result = new Uint8Array(bytesInBuffer)
      result.set(this.buffer.subarray(this.writePosition), 0)
      result.set(this.buffer.subarray(0, this.writePosition), firstPartSize)

      return result
    }
  }

  public async push(readable: ReadableStream<Uint8Array>): Promise<void> {
    try {
      await readable.pipeTo(this.writable, { preventClose: true })
    } catch (e) {
      console.warn('[stream] error:', e)
    }
  }

  public pull(): ReadableStream<Uint8Array> {
    let cleanup = () => {}

    return new ReadableStream({
      type: 'bytes',

      start: (controller) => {
        // Send historical data first (zero-copy when possible)
        const historical = this.getHistoricalData()
        if (historical.length > 0) {
          controller.enqueue(historical)
        }

        // Add to readers for future data
        const reader = {
          controller,
          readPosition: this.writePosition,
        }
        this.readers.add(reader)
        cleanup = () => this.readers.delete(reader)
      },

      pull: (controller) => {
        // Find this reader and push available data
        for (const reader of this.readers) {
          if (reader.controller === controller) {
            this.pushDataToReader(reader)
            break
          }
        }
      },

      cancel: (reason) => {
        console.log('[stream] cancelled:', reason)
        cleanup()
      },
    })
  }

  public toResponse(): Response {
    return new Response(this.pull(), {
      headers: {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        connection: 'keep-alive',
      },
    })
  }

  // Helper methods
  public async writeText(text: string): Promise<void> {
    const writer = this.writable.getWriter()
    try {
      const chunk = this.encoder.encode(text)
      await writer.write(chunk)
    } finally {
      writer.releaseLock()
    }
  }

  public getBufferInfo() {
    return {
      size: this.bufferSize,
      writePosition: this.writePosition,
      totalWritten: this.totalWritten,
      bytesInBuffer: Math.min(this.totalWritten, this.bufferSize),
      hasWrapped: this.totalWritten > this.bufferSize,
      activeReaders: this.readers.size,
    }
  }
}
