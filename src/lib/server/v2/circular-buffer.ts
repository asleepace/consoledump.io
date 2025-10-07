export interface CircularBuffer {
  buffer: Uint8Array
  bufferSize: number
  writePosition: number
  totalWritten: number
  getAvailableBytes(readPosition: number): number
  getDataView(readPosition: number): Uint8Array<ArrayBufferLike>
  canReadPosition(readPosition: number): boolean
  write(chunk: Uint8Array): number
}

interface BufferConfig {
  bufferSize: number
}

interface ChunkBufferSize {
  chunkSize: number
  bufferSize: number
}

interface ReadPosition {
  readPosition: number
  bufferSize: number
}

class BufferErrror extends Error {}
class InvalidReadPosition extends BufferErrror {
  constructor({ readPosition, bufferSize }: ReadPosition) {
    super(`CircularBuffer: Read position (${readPosition}) exceeds buffer size (${bufferSize}).`)
  }
}

class ChunkTooLarge extends BufferErrror {
  constructor({ chunkSize, bufferSize }: ChunkBufferSize) {
    super(`CircularBuffer: Tried to write chunk (${chunkSize} bytes) to buffer (${bufferSize} bytes).`)
  }
}

/**
 *  Returns a circular buffer which has a fixed sized, but can be written to
 *  an unlimited amount of times.
 *
 *  @param {Object} config
 *  @param {number} config.bufferSize max size of the buffer.
 *
 *  @note this class can throw if the chunk size is too large or an invalid
 *  readPosition is passed.
 */
export function makeCircularBuffer({ bufferSize }: BufferConfig): CircularBuffer {
  const buffer = new Uint8Array(bufferSize)
  return {
    buffer,
    bufferSize,
    writePosition: 0,
    totalWritten: 0,
    canReadPosition(readPosition: number) {
      if (readPosition < 0 || readPosition >= this.bufferSize) {
        return false
      }
      // Haven't filled buffer yet
      if (this.totalWritten <= this.bufferSize) {
        return readPosition <= this.writePosition
      }

      // Buffer has wrapped - check if position hasn't been overwritten
      const bytesOverwritten = this.totalWritten - this.bufferSize
      return readPosition >= bytesOverwritten % this.bufferSize
    },
    getAvailableBytes(readPosition: number): number {
      if (!this.canReadPosition(readPosition)) throw new InvalidReadPosition({ readPosition, bufferSize })
      const writePos = this.writePosition
      if (readPosition === writePos) return 0
      if (readPosition < writePos) return writePos - readPosition
      return this.bufferSize - readPosition + writePos
    },
    write(chunk: Uint8Array): number | never {
      // handle edge case where the chunk is bigger than the buffer
      if (chunk.length > bufferSize) {
        throw new ChunkTooLarge({ chunkSize: chunk.length, bufferSize })
      }

      const writePos = this.writePosition
      const chunkLength = chunk.length

      // handle case where data fits in current buffer
      if (writePos + chunkLength <= bufferSize) {
        this.buffer.set(chunk, writePos)
        this.writePosition = writePos + chunkLength
        this.totalWritten += chunkLength
        return chunk.length
      }

      // handle case where data wraps current buffer
      const firstPartSize = bufferSize - writePos
      const secondPartSize = chunkLength - firstPartSize
      this.buffer.set(chunk.subarray(0, firstPartSize), writePos)
      this.buffer.set(chunk.subarray(firstPartSize), 0)
      this.writePosition = secondPartSize
      this.totalWritten += chunkLength
      return chunk.length
    },
    getDataView(readPosition: number) {
      if (readPosition > bufferSize) throw new InvalidReadPosition({ readPosition, bufferSize })
      if (readPosition === this.writePosition) return new Uint8Array(0)
      if (readPosition <= this.writePosition) return this.buffer.subarray(readPosition, this.writePosition)
      // Buffer has wrapped: need to combine two parts
      const firstPartSize = this.bufferSize - readPosition
      const secondPartSize = this.writePosition
      const totalSize = firstPartSize + secondPartSize

      // Only create new array when buffer wraps (unavoidable)
      const result = new Uint8Array(totalSize)
      result.set(this.buffer.subarray(readPosition), 0)
      result.set(this.buffer.subarray(0, this.writePosition), firstPartSize)
      return result
    },
  }
}
