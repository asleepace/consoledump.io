import { ApiError } from './api-error'
import { createFileBasedStream } from './stream'

type DumpSession = Awaited<ReturnType<typeof createFileBasedStream>>

/**
 * ## ConsoleDumpSession
 *
 * Store which holds all active console dump sessions and handles
 * creating, reading, updating and deleting.
 *
 * @note this is the main entrypoint.
 */
export class ConsoleDumpSessions {
  constructor(
    public options: {
      maxSessions: number
    }
  ) {}

  public activeSessions = new Map<string, DumpSession>()

  public getOrCreate(id: string) {
    return this.getSession(id) || this.createSession(id)
  }

  public getSession(id: string) {
    return this.activeSessions.get(id)
  }

  public async createSession(id: string) {
    if (this.activeSessions.size >= this.options.maxSessions) {
      throw new ApiError('Too many sessions!', {
        total: this.activeSessions.size,
      })
    }
    const session = await createFileBasedStream({ streamId: id })
    this.activeSessions.set(id, session)
    return session
  }

  public async delete(id: string) {
    const session = this.activeSessions.get(id)
    if (!session) return
    this.activeSessions.delete(id)
    return session.delete()
  }

  // --- helpers ---

  public async handleRequest(req: Request) {
    const url = new URL(req.url)
    const idParam = url.searchParams.get('id')
    const idPath = url.pathname.slice(1)
    const id = idParam ?? idPath
    const type = req.headers.get('content-type')

    if (!id) throw new ApiError('Missing required param "id" or valid path.')

    const session = await this.getOrCreate(id)

    // handle content
    if (req.method === 'GET' && type === 'text/event-stream') {
      return session.subscribe()
    }

    // handle incoming post requests
    if (req.method === 'POST' && req.body) {
      session.publish(req.body)
      return Response.json({ ok: true })
    }
  }
}
