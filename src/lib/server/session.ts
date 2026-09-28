import { ApiError } from '../shared/api-error'
import { createFileBasedStream } from './stream'
import { gc } from '@/lib/server/garbage-collector'

type DumpSession = Awaited<ReturnType<typeof createFileBasedStream>>

/** A session with no subscribers and no activity for this long is closed. */
export const IDLE_SESSION_MS = 10 * 60_000
const SWEEP_INTERVAL_MS = 60_000

/**
 * ## ConsoleDumpSession
 *
 * Store which holds all active console dump sessions and handles
 * creating, reading, updating and deleting.
 *
 *  - Runs garbage collection when creating a stream
 *  - Runs garbase collection when deleting a stream
 *
 * @note this is the main entrypoint.
 */
export class ConsoleDumpSessions {
  public activeSessions = new Map<string, DumpSession>()

  constructor(
    public options: {
      maxSessions: number
      /** Start the idle sweep on an interval (off in tests). */
      sweep?: boolean
    }
  ) {
    if (options.sweep !== false) {
      setInterval(() => void this.evictIdleSessions(), SWEEP_INTERVAL_MS).unref?.()
    }
  }

  /**
   * Close and forget sessions nobody is using. Sessions used to live until
   * the process restarted, each holding a file descriptor and an in-memory
   * buffer; every homepage visit creates one, so they piled up by the
   * thousand. Evicting is safe: the dump stays on disk and the next request
   * for the id rebuilds the session from it.
   */
  public async evictIdleSessions(now = Date.now()): Promise<string[]> {
    const evicted: string[] = []
    for (const [id, session] of this.activeSessions) {
      if (session.clients > 0 || session.isPublishing) continue
      if (now - +session.lastActiveAt < IDLE_SESSION_MS) continue
      this.activeSessions.delete(id)
      evicted.push(id)
      await session.close().catch((e) => console.warn('[sessions] close failed:', id, e))
    }
    if (evicted.length) console.log(`[sessions] evicted ${evicted.length} idle (active=${this.activeSessions.size})`)
    return evicted
  }

  public getOrCreate(id: string) {
    return this.getSession(id) || this.createSession(id)
  }

  public getSession(id: string) {
    return this.activeSessions.get(id)
  }

  public async createSession(id: string) {
    await gc.runGarbageCollection() // run garbage collection

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
    await gc.runGarbageCollection()
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

    // handle content
    if (req.method === 'GET' && type === 'text/event-stream') {
      const session = await this.getOrCreate(id)
      return session.subscribe()
    }

    // handle incoming post requests
    if (req.method === 'POST' && req.body) {
      const session = await this.getOrCreate(id)
      session.publish(req.body)
      return Response.json({ ok: true })
    }

    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }
}
