export type EncodedMessage = Uint8Array<ArrayBufferLike>
export type PipeData = (encoded: EncodedMessage) => void
export type SessionId = string
export type Subscription = {
  createdAt: Date
  updatedAt: Date
  tabId: string
  send: PipeData
}

export class Session {
  // // Class properties
  // static ID_SIZE = 6
  // static sessions: Map<string, Session> = new Map()

  // static from(url: string) {
  //   const sessionId = this.getIdFromUrl(url)
  //   return this.withId(sessionId)
  // }

  // static create(url: string) {
  //   const sessionId = this.getIdFromUrl(url)
  //   if (!this.sessions.has(sessionId)) {
  //     this.sessions.set(sessionId, new Session(sessionId))
  //   }
  //   const current = this.sessions.get(sessionId)
  //   if (!current) throw new Error("Failed to create session: " + sessionId)
  //   return current
  // }

  // static unsubscribe(sessionId: string, tadId: string) {
  //   const
  // }

  // static withId(sessionId: string) {
  //   const current = this.sessions.get(sessionId)
  //   if (current) {
  //     return current
  //   }
  //   throw new Error("Failed to find session for:" + sessionId)
  // }

  // static getIdFromUrl(url: string) {
  //   const path = new URL(url).pathname.slice(1)
  //   const sessionId = path.split("?")[0]
  //   console.log("[session] id:", sessionId)
  //   if (!sessionId) throw new Error("Missing session id!")
  //   if (sessionId.length !== Session.ID_SIZE) {
  //     throw new Error("Invalid session id!")
  //   }
  //   return sessionId
  // }

  // Instance properties

  public subscriptions: Map<string, Subscription> = new Map()
  public lastSubscriptionId: number = 0
  public messages: string[] = []
  public encoder = new TextEncoder()
  public createdAt: Date
  public updatedAt: Date
  public lastId: number = 0

  constructor(public sessionId: string) {
    this.createdAt = new Date()
    this.updatedAt = new Date()
  }

  private encode(id: number, data: string) {
    return this.encoder.encode(`id: ${id}\ndata: ${data}\n\n`)
  }

  private didUpdate() {
    this.updatedAt = new Date()
  }

  private addMessageToCache(data: string) {
    this.messages.unshift(data)
    this.messages.length = 100
  }

  private createSubscription = (
    tabId: string,
    pipe: PipeData
  ): Subscription => ({
    createdAt: new Date(),
    updatedAt: new Date(),
    tabId: tabId,
    send(encoded: EncodedMessage) {
      pipe(encoded)
      this.updatedAt = new Date()
    },
  })

  /**
   * Send data to all subscriptions
   * @param data
   */
  broadcast(data: string) {
    const messageId = this.lastId++
    this.subscriptions.forEach((subscription) => {
      console.log("[session] sending to:", subscription.tabId)
      subscription.send(this.encode(messageId, data))
    })
    this.didUpdate()
  }

  /**
   * Registers a subscription for the current parent session which
   * can pipe data to the event stream.
   * @param tabdId
   * @param pipe
   */
  subscribe(tabdId: string, pipe: PipeData) {
    console.log("[subscription] adding subscription:", tabdId)
    const subscription = this.createSubscription(tabdId, pipe)
    this.subscriptions.set(tabdId, subscription)
    this.didUpdate()
    // hydrate with cached messages
    this.messages.reverse().forEach((msg, i) => {
      const encoded = this.encode(i, msg)
      subscription.send(encoded)
    })
  }

  /**
   * Un-subscribes a subscription from the current parent.
   * @param tabId
   */
  unsubscribe(tabId: string) {
    console.log("[Session] unsubscribing:", tabId)
    this.subscriptions.delete(tabId)
    this.didUpdate()
  }
}
