import type { BunFile } from 'bun'
import { open, type FileHandle } from 'node:fs/promises'

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

  /**
   * Allocated on first use: a session that is only viewed (every homepage
   * visit makes one) shouldn't reserve `bufferSize` bytes of memory.
   */
  private _buffer?: Uint8Array
  private readonly file: BunFile
  /**
   * Opened on first write, in append mode. Opening it eagerly created the file
   * and held a descriptor, so sessions nobody writes to leaked one each; and
   * `Bun.file().writer()` truncates, which wiped a dump whenever its session
   * was recreated (e.g. after a restart) before it could be hydrated.
   */
  private fileWriter?: Promise<FileHandle>
  /** Disk writes run one at a time, in order; callers don't always await. */
  private pendingWrites: Promise<unknown> = Promise.resolve()
  readonly filePath: string

  private isInMemory = false
  private isHydrated = false
  private hasWritten = false
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
    this.filePath = filePath
    this.file = Bun.file(filePath)
  }

  private get buffer(): Uint8Array {
    return (this._buffer ??= new Uint8Array(this.options.bufferSize))
  }

  private get writer(): Promise<FileHandle> {
    return (this.fileWriter ??= open(this.filePath, 'a'))
  }

  /** Whether this file currently holds an open descriptor. */
  public get isOpen(): boolean {
    return this.fileWriter !== undefined
  }

  public async getInfo() {
    console.log('[buffered-file] getting info:', this.filePath)
    const file = Bun.file(this.filePath)
    // The file only exists once something has been written to it.
    const exists = await file.exists()
    const now = new Date()
    const fileStat = exists ? await file.stat() : { birthtime: now, atime: now }
    const fileInfo = {
      filePath: this.filePath,
      fileSize: exists ? file.size : 0,
      exists,
      isInMemory: this.isInMemory,
      isHydrated: this.isHydrated,
      bufferSize: this.options.bufferSize,
      maxFileSize: this.options.maxFileSize,
      totalBytesWritten: this.totalBytesWritten,
      hasWritten: this.hasWritten,
      createdAt: fileStat.birthtime.toLocaleDateString('en-US', {
        dateStyle: 'medium',
      }),
      updatedAt: fileStat.atime.toLocaleDateString('en-US', {
        dateStyle: 'medium',
      }),
    } as const
    return fileInfo
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

  public persistTransform() {
    return new TransformStream({
      transform: (chunk, controller) => {
        this.write(chunk)
        controller.enqueue(chunk)
      },
    })
  }

  public async write(chunk: Uint8Array) {
    this.writeToCircularBuffer(chunk)
    this.hasWritten = true

    // Write to file immediately
    const write = this.pendingWrites.then(async () => {
      const writer = await this.writer
      await writer.write(chunk)
    })
    this.pendingWrites = write.catch((e) => console.warn('[buffered-file] write failed:', e))
    await write

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
    if (!this._buffer) return new Uint8Array(0)
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
  public byteStream(): ReadableStream<Uint8Array> {
    if (!this.isInMemory) return this.file.stream()
    return new ReadableStream({
      start: (controller) => {
        controller.enqueue(this.readBuffer())
        controller.close()
      },
    })
  }

  public async deleteFile() {
    try {
      await this.close()
      if (!(await this.file.exists())) return
      return this.file.delete()
    } catch (e) {
      console.warn('[buffered-file] failed to delete:', e)
    }
  }

  /** Closes the file descriptor, if one is open. Safe to call more than once. */
  public async close() {
    await this.pendingWrites
    const writer = this.fileWriter
    this.fileWriter = undefined
    await (await writer)?.close()
  }
}
