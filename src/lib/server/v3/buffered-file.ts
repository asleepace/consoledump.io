import type { BunFile } from 'bun'

/**
 * ## Buffered File
 *
 * This class handle reading and writing files to disk,
 * storing a small preview in-memory, and manging memory
 * usage limits.
 *
 *  1. Handles creating, reading & writing to file on disk
 *  2. In-memory buffer used while memory footprint is small
 *  3. Periodically sync with persisted file
 *  4. Provides abstractions for reading / writing
 *
 * @note determine a strategy for periodically writing data
 * to disk, since we can received a lot of bulks data quickly,
 * we want to sync when not busy. Data integrity is nice to have
 * but not needed.
 *
 * ```ts
 * const bufferdFile = new BufferedFile({ fileName: `${streamId}.log`, ...options  })
 *
 * await bufferedFile.hydrateBuffer()
 *
 * ```
 *
 */
export class BufferedFile {
  static readonly outDir: string = './public/dumps'

  private readonly buffer: Uint8Array
  private readonly file: BunFile
  private readonly fileWriter: ReturnType<BunFile['writer']>
  private readonly filePath: string

  private isInMemory = false
  private isHydrated = false
  private writePos = 0
  private totalBytesWritten = 0

  constructor(
    public options: {
      fileName: string
      maxFileSize: number
      bufferSize: number
    }
  ) {
    const filePath = `${BufferedFile.outDir}/${options.fileName}`
    this.buffer = new Uint8Array(options.bufferSize)
    this.file = Bun.file(filePath)
    this.fileWriter = this.file.writer()
    this.filePath = filePath
  }

  public async hydrateBuffer() {
    if (this.isHydrated) return
    if (!(await this.file.exists())) {
      this.isHydrated = true
      this.isInMemory = true
      return
    }

    if (this.file.size >= this.options.bufferSize) {
      this.isInMemory = false
      this.isHydrated = true
      return
    }

    this.writePos = 0
    for await (const chunk of this.file.stream()) {
      this.buffer.set(chunk, this.writePos)
      this.writePos += chunk.length
      this.totalBytesWritten += chunk.length
    }

    this.isHydrated = true
    this.isInMemory = true
  }

  public async write(chunk: Uint8Array) {
    this.writeToCircularBuffer(chunk)

    // Write to file immediately
    this.fileWriter.write(chunk)
    await this.fileWriter.flush()

    // Mark as not in-memory if buffer wrapped
    if (this.hasBufferWrapped) {
      this.isInMemory = false
    }
  }

  private writeToCircularBuffer(chunk: Uint8Array) {
    const bufferSize = this.options.bufferSize
    const writePos = this.writePos
    const chunkLength = chunk.length
    const nextOffset = writePos + chunkLength

    if (nextOffset <= bufferSize) {
      this.buffer.set(chunk, writePos)
      this.writePos = nextOffset
      this.totalBytesWritten += chunk.length
      return
    }

    // Wrap case
    const firstPartSize = bufferSize - writePos
    this.buffer.set(chunk.subarray(0, firstPartSize), writePos)
    this.buffer.set(chunk.subarray(firstPartSize), 0)
    this.writePos = (writePos + chunkLength) % bufferSize
    this.totalBytesWritten += chunkLength
  }

  /** helper which returns true if the buffer has wrapped. */
  public get hasBufferWrapped() {
    return this.totalBytesWritten > this.options.bufferSize
  }

  /** read bytes from in-memory buffer. */
  public readBuffer(): Uint8Array {
    if (!this.hasBufferWrapped) {
      return this.buffer.slice(0, this.writePos)
    }

    // Buffer has wrapped - reconstruct in order
    const firstPartSize = this.options.bufferSize - this.writePos
    const dataFrame = new Uint8Array(this.options.bufferSize)
    dataFrame.set(this.buffer.subarray(this.writePos), 0)
    dataFrame.set(this.buffer.subarray(0, this.writePos), firstPartSize)
    return dataFrame
  }

  /** returns a readable stream of entire history. */
  public streamData(): ReadableStream<Uint8Array> {
    if (!this.isInMemory) return this.file.stream()
    return new ReadableStream({
      start: (controller) => {
        controller.enqueue(this.readBuffer())
        controller.close()
      },
    })
  }

  /** closes file. */
  public async close() {
    await this.fileWriter.end()
  }
}
