// Advanced piping: one source, multiple destinations and transforms
// TEST: This is not used.

export class BroadcastSSE extends Response {
  private controller: ReadableStreamDefaultController<Uint8Array> | null = null
  private textEncoder = new TextEncoder()
  private activeTasks = new Set<string>()
  private eventId = 0

  public isConnected = false
  public streamId: string

  constructor(public eventType?: string) {
    const streamId = crypto.randomUUID()

    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        this.controller = controller
        this.isConnected = true
      },
      cancel: () => {
        this.cleanup()
      },
    })

    const headers = new Headers({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "X-Stream-ID": streamId,
    })

    super(stream, { headers })
    this.streamId = streamId
  }

  private sendEvent(channel: string, type: string, data: any): void {
    if (!this.isConnected || !this.controller) return

    const eventType = this.eventType ? `event: ${this.eventType}\n` : ""
    const eventId = `id: ${this.eventId++}\n`
    const eventData = `data: ${JSON.stringify({ channel, type, ...data })}\n\n`
    const fullEvent = eventType + eventId + eventData

    this.controller.enqueue(this.textEncoder.encode(fullEvent))
  }

  // Tee a stream and process each branch differently
  async pipeWithTee(
    taskId: string,
    source: ReadableStream<Uint8Array>,
    branches: Array<{
      name: string
      transforms?: TransformStream<Uint8Array, Uint8Array>[]
      processor?: (chunk: Uint8Array) => Promise<void> | void
    }>
  ): Promise<void> {
    this.activeTasks.add(taskId)

    try {
      this.sendEvent(taskId, "started", { branches: branches.length })

      // Tee the stream for each branch
      const tees = this.createMultipleTees(source, branches.length)

      // Process each branch concurrently
      const branchPromises = branches.map(async (branch, index) => {
        const branchId = `${taskId}-${branch.name}`

        try {
          this.sendEvent(branchId, "branch_started", { branch: branch.name })

          let stream = tees[index]

          // Apply transforms
          if (branch.transforms) {
            for (const transform of branch.transforms) {
              stream = stream.pipeThrough(transform)
            }
          }

          // Process the stream
          if (branch.processor) {
            // Custom processor
            await stream.pipeTo(
              new WritableStream({
                write: async (chunk) => {
                  await branch.processor!(chunk)
                  this.sendEvent(branchId, "chunk", {
                    branch: branch.name,
                    size: chunk.byteLength,
                  })
                },
              })
            )
          } else {
            // Default: send chunks as SSE events
            await stream.pipeTo(
              new WritableStream({
                write: (chunk) => {
                  const data = new TextDecoder().decode(chunk)
                  this.sendEvent(branchId, "data", {
                    branch: branch.name,
                    data,
                  })
                },
              })
            )
          }

          this.sendEvent(branchId, "branch_completed", { branch: branch.name })
        } catch (error) {
          this.sendEvent(branchId, "branch_error", {
            branch: branch.name,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      })

      await Promise.allSettled(branchPromises)
      this.sendEvent(taskId, "completed", {})
    } catch (error) {
      this.sendEvent(taskId, "error", {
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      this.activeTasks.delete(taskId)
      if (this.activeTasks.size === 0) {
        this.close()
      }
    }
  }

  // Helper to create multiple tees from one stream
  private createMultipleTees(
    source: ReadableStream<Uint8Array>,
    count: number
  ): ReadableStream<Uint8Array>[] {
    if (count === 1) return [source]

    let streams: ReadableStream<Uint8Array>[] = [source]

    for (let i = 1; i < count; i++) {
      const lastStream = streams[streams.length - 1]
      const [stream1, stream2] = lastStream.tee()
      streams[streams.length - 1] = stream1
      streams.push(stream2)
    }

    return streams
  }

  // Pipeline: source -> multiple transforms -> multiple destinations
  async pipelineWithFanOut(
    taskId: string,
    source: ReadableStream<Uint8Array>,
    pipeline: {
      // Initial transforms applied to the source
      inputTransforms?: TransformStream<Uint8Array, Uint8Array>[]
      // Fan out to multiple destinations
      destinations: Array<{
        name: string
        transforms?: TransformStream<Uint8Array, Uint8Array>[]
        format?: "raw" | "json" | "lines" | "base64"
      }>
    }
  ): Promise<void> {
    this.activeTasks.add(taskId)

    try {
      let stream = source

      // Apply input transforms
      if (pipeline.inputTransforms) {
        for (const transform of pipeline.inputTransforms) {
          stream = stream.pipeThrough(transform)
        }
      }

      // Create branches for each destination
      const branches = pipeline.destinations.map((dest) => ({
        name: dest.name,
        transforms: [
          ...(dest.transforms || []),
          ...(dest.format ? [this.getFormatTransform(dest.format)] : []),
        ],
      }))

      await this.pipeWithTee(taskId, stream, branches)
    } catch (error) {
      this.sendEvent(taskId, "error", {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  private getFormatTransform(
    format: string
  ): TransformStream<Uint8Array, Uint8Array> {
    switch (format) {
      case "json":
        return StreamTransforms.json()
      case "lines":
        return StreamTransforms.lineNumbers()
      case "base64":
        return new TransformStream({
          transform(chunk, controller) {
            const base64 = btoa(String.fromCharCode(...chunk))
            controller.enqueue(new TextEncoder().encode(base64 + "\n"))
          },
        })
      default:
        return new TransformStream() // passthrough
    }
  }

  // Real-time analysis while streaming
  async pipeWithAnalysis(
    taskId: string,
    source: ReadableStream<Uint8Array>
  ): Promise<void> {
    const analytics = {
      totalBytes: 0,
      chunkCount: 0,
      startTime: Date.now(),
      wordCount: 0,
      lineCount: 0,
    }

    const analysisTransform = new TransformStream({
      transform(chunk, controller) {
        // Update analytics
        analytics.totalBytes += chunk.byteLength
        analytics.chunkCount++

        const text = new TextDecoder().decode(chunk)
        analytics.wordCount += (text.match(/\S+/g) || []).length
        analytics.lineCount += (text.match(/\n/g) || []).length

        controller.enqueue(chunk)
      },
    })

    const branches = [
      {
        name: "raw",
        transforms: [analysisTransform],
      },
      {
        name: "analysis",
        transforms: [analysisTransform],
        processor: async () => {
          // Send periodic analytics updates
          this.sendEvent(`${taskId}-analytics`, "stats", {
            ...analytics,
            elapsed: Date.now() - analytics.startTime,
            bytesPerSecond:
              analytics.totalBytes /
              ((Date.now() - analytics.startTime) / 1000),
          })
        },
      },
    ]

    await this.pipeWithTee(taskId, source, branches)
  }

  close(): void {
    if (this.controller && this.isConnected) {
      this.controller.close()
    }
    this.cleanup()
  }

  private cleanup(): void {
    this.isConnected = false
    this.controller = null
    this.activeTasks.clear()
  }
}

// Enhanced stream transforms with more utilities
export const StreamTransforms = {
  // Convert chunks to JSON
  json(): TransformStream<Uint8Array, Uint8Array> {
    let buffer = ""

    return new TransformStream({
      transform(chunk, controller) {
        buffer += new TextDecoder().decode(chunk)

        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.trim()) {
            try {
              const parsed = JSON.parse(line)
              const formatted = JSON.stringify(parsed, null, 2)
              controller.enqueue(new TextEncoder().encode(formatted + "\n"))
            } catch {
              controller.enqueue(new TextEncoder().encode(line + "\n"))
            }
          }
        }
      },
      flush(controller) {
        if (buffer.trim()) {
          try {
            const parsed = JSON.parse(buffer)
            const formatted = JSON.stringify(parsed, null, 2)
            controller.enqueue(new TextEncoder().encode(formatted))
          } catch {
            controller.enqueue(new TextEncoder().encode(buffer))
          }
        }
      },
    })
  },

  // Add line numbers
  lineNumbers(): TransformStream<Uint8Array, Uint8Array> {
    let buffer = ""
    let lineNum = 0

    return new TransformStream({
      transform(chunk, controller) {
        buffer += new TextDecoder().decode(chunk)

        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          const numbered = `${++lineNum}: ${line}\n`
          controller.enqueue(new TextEncoder().encode(numbered))
        }
      },
      flush(controller) {
        if (buffer) {
          const numbered = `${++lineNum}: ${buffer}`
          controller.enqueue(new TextEncoder().encode(numbered))
        }
      },
    })
  },

  // Throttle chunks
  throttle(delayMs: number): TransformStream<Uint8Array, Uint8Array> {
    return new TransformStream({
      async transform(chunk, controller) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
        controller.enqueue(chunk)
      },
    })
  },

  // Batch chunks together
  batch(size: number): TransformStream<Uint8Array, Uint8Array> {
    let buffer = new Uint8Array(0)

    return new TransformStream({
      transform(chunk, controller) {
        const newBuffer = new Uint8Array(buffer.length + chunk.length)
        newBuffer.set(buffer)
        newBuffer.set(chunk, buffer.length)
        buffer = newBuffer

        while (buffer.length >= size) {
          controller.enqueue(buffer.slice(0, size))
          buffer = buffer.slice(size)
        }
      },
      flush(controller) {
        if (buffer.length > 0) {
          controller.enqueue(buffer)
        }
      },
    })
  },

  // Compress using gzip
  compress(): TransformStream<Uint8Array, Uint8Array> {
    let duplex: {
      stream: CompressionStream
      reader: ReadableStreamDefaultReader<Uint8Array>
      writer: WritableStreamDefaultWriter<Uint8Array>
    } | null = null

    return new TransformStream({
      start() {
        const stream = new CompressionStream("gzip")
        const reader = stream.readable.getReader()
        const writer = stream.writable.getWriter()
        duplex = {
          stream,
          reader,
          writer,
        }
      },
      async transform(chunk, controller) {
        await duplex?.writer.write(chunk)

        // Try to read compressed data
        const result = await duplex?.reader.read()
        if (!result?.done && result?.value) {
          controller.enqueue(result.value)
        }
      },
      async flush(controller) {
        await duplex?.writer.close()

        // Read remaining compressed data
        let result = await duplex?.reader.read()
        while (!result?.done && result?.value) {
          controller.enqueue(result.value)
          result = await duplex?.reader.read()
        }
      },
    })
  },

  // Decrypt/encrypt (basic example)
  xorCipher(key: number): TransformStream<Uint8Array, Uint8Array> {
    return new TransformStream({
      transform(chunk, controller) {
        const encrypted = new Uint8Array(chunk.length)
        for (let i = 0; i < chunk.length; i++) {
          encrypted[i] = chunk[i] ^ key
        }
        controller.enqueue(encrypted)
      },
    })
  },

  // Progress tracking
  progress(
    onProgress: (bytes: number) => void
  ): TransformStream<Uint8Array, Uint8Array> {
    let totalBytes = 0

    return new TransformStream({
      transform(chunk, controller) {
        totalBytes += chunk.byteLength
        onProgress(totalBytes)
        controller.enqueue(chunk)
      },
    })
  },
}

// Usage Examples:

// Example 1: Multi-destination processing
export async function createMultiDestinationSSE() {
  const sse = new BroadcastSSE("broadcast")

  const response = await fetch("https://jsonplaceholder.typicode.com/posts")
  if (!response.body) throw new Error("No response body")

  await sse.pipelineWithFanOut("multi-process", response.body, {
    inputTransforms: [
      StreamTransforms.batch(1024), // Batch into 1KB chunks
    ],
    destinations: [
      {
        name: "raw",
        format: "raw",
      },
      {
        name: "formatted",
        format: "json",
        transforms: [StreamTransforms.lineNumbers()],
      },
      {
        name: "compressed",
        transforms: [StreamTransforms.compress()],
        format: "base64",
      },
      {
        name: "encrypted",
        transforms: [StreamTransforms.xorCipher(42)],
        format: "base64",
      },
    ],
  })

  return sse
}

// Example 2: Real-time data analysis
export async function createAnalyticsSSE() {
  const sse = new BroadcastSSE("analytics")

  const response = await fetch("https://httpbin.org/stream/100")
  if (!response.body) throw new Error("No response body")

  await sse.pipeWithAnalysis("stream-analysis", response.body)

  return sse
}

// Example 3: Complex pipeline with multiple sources
export async function createComplexPipeline() {
  const sse = new BroadcastSSE("complex")

  const sources = [
    fetch("https://jsonplaceholder.typicode.com/posts").then((r) => r.body!),
    fetch("https://jsonplaceholder.typicode.com/users").then((r) => r.body!),
    fetch("https://httpbin.org/stream/10").then((r) => r.body!),
  ]

  const promises = sources.map(async (sourcePromise, index) => {
    const source = await sourcePromise
    const taskId = `complex-${index}`

    await sse.pipeWithTee(taskId, source, [
      {
        name: "original",
        transforms: [],
      },
      {
        name: "processed",
        transforms: [
          StreamTransforms.json(),
          StreamTransforms.lineNumbers(),
          StreamTransforms.throttle(100),
        ],
      },
      {
        name: "analytics",
        transforms: [
          StreamTransforms.progress((bytes) => {
            sse.sendEvent(`${taskId}-progress`, "update", { bytes })
          }),
        ],
      },
    ])
  })

  await Promise.allSettled(promises)
  return sse
}

// Example 4: Create a custom readable and pipe it through transforms
export function createGeneratedDataSSE() {
  const sse = new BroadcastSSE("generated")

  // Create a stream that generates JSON objects
  const generatedStream = new ReadableStream({
    start(controller) {
      let count = 0
      const interval = setInterval(() => {
        const data = {
          id: ++count,
          timestamp: new Date().toISOString(),
          value: Math.random() * 100,
          status: count % 3 === 0 ? "error" : "success",
        }

        controller.enqueue(
          new TextEncoder().encode(JSON.stringify(data) + "\n")
        )

        if (count >= 20) {
          clearInterval(interval)
          controller.close()
        }
      }, 500)
    },
  })

  sse.pipeWithTee("generated-data", generatedStream, [
    {
      name: "raw-json",
      transforms: [],
    },
    {
      name: "formatted",
      transforms: [StreamTransforms.json(), StreamTransforms.lineNumbers()],
    },
    {
      name: "filtered-errors",
      transforms: [
        StreamTransforms.filter((text) => text.includes("error")),
        StreamTransforms.json(),
      ],
    },
    {
      name: "throttled",
      transforms: [
        StreamTransforms.throttle(1000),
        StreamTransforms.lineNumbers(),
      ],
    },
  ])

  return sse
}
