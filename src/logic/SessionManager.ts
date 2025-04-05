import { Session } from "./Session"

type Ids = {
  sessionId: string | undefined
  tabId: string | undefined
}

export const getIds = (request: Request): Ids => {
  const url = new URL(request.url)
  const params = url.searchParams
  const tabId = params.get("stream") || undefined
  const sessionId = url.pathname.split("?")[0]?.slice(1)
  return { tabId, sessionId }
}

/**
 * Manager which handle creating, updating and deleting
 * active sessions.
 */
export class SessionManager {
  public sessions: Map<string, Session> = new Map()

  constructor() {
    console.log("[manager] starting...")
  }

  public get(request: Request) {
    const { sessionId } = getIds(request)
    if (!sessionId) return undefined
    return this.sessions.get(sessionId)
  }

  /**
   * Get or create a new session context.
   * @param request
   */
  public from(request: Request) {
    const { sessionId } = getIds(request)
    if (!sessionId) throw new Error("Missing session id!")

    const current = this.sessions.get(sessionId)
    if (current) return current

    const session = new Session(sessionId)
    this.sessions.set(sessionId, session)
    return session
  }

  /**
   * POST a message to all event stream subscribers.
   * @param request
   */
  public async post(request: Request) {
    const session = this.get(request)
    const data = await request.text()
    session?.broadcast(data)
  }

  /**
   * Adds a subscription for the session.
   * @param request
   */
  public stream(request: Request): ReadableStream {
    const { sessionId, tabId } = getIds(request)
    console.log("[manager] stream:", { sessionId, tabId })

    if (!sessionId || !tabId) {
      throw new Error("Missing sessionId or tabId!")
    }

    // create new session if it doesn't exist already
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, new Session(sessionId))
    }

    // extract session
    const session = this.sessions.get(sessionId)
    if (!session) throw new Error("Invalid session!")

    // create readable stream
    return new ReadableStream({
      start(controller) {
        // add the controller to the session subscriptions
        console.log("[manager] stream started:", tabId)
        session.subscribe(tabId, (encoded) => {
          controller.enqueue(encoded)
        })

        // register an abort signal
        request.signal.onabort = () => {
          console.log("[manager] stream aborted:", tabId)
          this.cancel?.("aborted")
        }

        // send first message
        session.broadcast(`client connected: ${tabId}`)
      },
      cancel() {
        console.log("[manager] stream closed:", tabId)
        session.unsubscribe(tabId)
      },
    })
  }

  /**
   * Removes a subscription from the session.
   * @param request
   * @returns
   */
  public unsubscribe(request: Request) {
    const { tabId, sessionId } = getIds(request)
    const session = this.get(request)

    if (!session) {
      console.log("[manager] session not found:", sessionId)
      return
    }

    if (tabId) {
      console.log("[manager] un-subscribing:", tabId)
      session.unsubscribe(tabId)
    }
  }

  /**
   * Clear all sessions.
   */
  public purge() {
    console.log("[manager] purging all session!")
    this.sessions.clear()
  }
}
