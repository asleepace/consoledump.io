import { SSEStream } from "./sse-event"

type TaskPayload = {
  url: string | URL
  method?: RequestInit["method"]
  body?: BodyInit
  headers?: HeadersInit
}

type TaskResult = {
  taskId: string
  status: "started" | "chunk" | "completed" | "error"
  data?: any
  error?: string
}

export class TaskQueue {
  private tasks: Array<{ id: string; payload: TaskPayload }> = []

  constructor(private stream: SSEStream) {}

  schedule(payload: TaskPayload): string {
    const taskId = crypto.randomUUID()
    this.tasks.push({ id: taskId, payload })
    return taskId
  }

  async executeAll(): Promise<void> {
    for (const task of this.tasks) {
      await this.executeTask(task.id, task.payload)
    }
    this.stream.close()
  }

  private async executeTask(
    taskId: string,
    payload: TaskPayload
  ): Promise<void> {
    try {
      this.stream.sendEvent({
        taskId,
        status: "started",
      })

      const response = await fetch(payload.url, {
        method: payload.method || "GET",
        body: payload.body,
        headers: payload.headers,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      if (response.body) {
        const reader = response.body.getReader()

        try {
          while (this.stream.isConnected) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = new TextDecoder().decode(value)
            this.stream.sendEvent({
              taskId,
              status: "chunk",
              data: chunk,
            })
          }
        } finally {
          reader.releaseLock()
        }
      }

      this.stream.sendEvent({
        taskId,
        status: "completed",
      })
    } catch (error) {
      this.stream.sendEvent({
        taskId,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }
}

// Usage example:
export function createSSETaskRunner(eventType?: string) {
  const stream = new SSEStream(eventType)
  const queue = new TaskQueue(stream)

  return {
    response: stream.response,
    schedule: (payload: TaskPayload) => queue.schedule(payload),
    execute: () => queue.executeAll(),
    stream,
  }
}
