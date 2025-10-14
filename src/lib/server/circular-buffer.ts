import { ApiError } from '../shared/api-error'

interface CircularBuffer {
  buffer: Uint8Array
  bufferSize: number
  writePosition: number
  wrapCount: number
  totalBytesWritten: number
  getAvailableSpace(): number
  getDataView(readPosition: number): Uint8Array<ArrayBufferLike>
  setWritePosition(chunkSize: number): void
  write(chunk: Uint8Array): void
}

const KB = 1024
const MB = KB * KB
const GB = KB * MB

const MAX_BUFFER_SIZE = 5 * MB

/**
 *  ## Circular Bufffer
 *
 *  Returns a circular buffer which has a fixed sized, but can be written to
 *  an unlimited amount of times.
 *
 *  @note this class can throw if the chunk size is too large or an invalid
 *  readPosition is passed.
 */
export function makeCircularBuffer({
  bufferSize = MAX_BUFFER_SIZE,
}): CircularBuffer {
  const buffer = new Uint8Array(bufferSize)

  return {
    buffer,
    bufferSize,
    writePosition: 0,
    totalBytesWritten: 0,
    wrapCount: 0,
    setWritePosition(chunkSize: number) {
      this.writePosition = (this.writePosition + chunkSize) % bufferSize
      this.totalBytesWritten += chunkSize
    },
    getAvailableSpace() {
      return bufferSize - this.writePosition
    },
    write(chunk: Uint8Array): void {
      if (chunk.length > this.bufferSize) {
        throw new ApiError('Chunk too large!', {
          chunkSize: chunk.length,
          bufferSize,
        })
      }

      const writePos = this.writePosition
      const chunkLength = chunk.length

      // handle case where data fits in current buffer
      if (writePos + chunkLength <= bufferSize) {
        this.buffer.set(chunk, writePos)
        this.setWritePosition(chunkLength)
        return
      }

      // handle case where data wraps current buffer
      const firstPartSize = bufferSize - writePos
      this.buffer.set(chunk.subarray(0, firstPartSize), writePos)
      this.buffer.set(chunk.subarray(firstPartSize), 0)
      this.wrapCount++
      this.writePosition = (writePos + chunkLength) % this.bufferSize
      this.totalBytesWritten += chunkLength
    },
    getDataView(readPosition: number) {
      // read position and cursor are in sync with buffer
      if (readPosition === this.writePosition) {
        return new Uint8Array(0)
      }

      // handle normal case where we just need to return a slice.
      if (readPosition <= this.writePosition) {
        return this.buffer.subarray(readPosition, this.writePosition)
      }

      // Buffer has wrapped: need to combine two parts
      const firstPartSize = this.bufferSize - readPosition
      const secondPartSize = this.writePosition
      const totalSize = firstPartSize + secondPartSize

      // Only create new array when buffer wraps (unavoidable)
      const dataFrame = new Uint8Array(totalSize)
      dataFrame.set(this.buffer.subarray(readPosition), 0)
      dataFrame.set(this.buffer.subarray(0, this.writePosition), firstPartSize)
      return dataFrame
    },
  }
}
