import { ids } from '@/lib/shared/ids'

export class SessionUrl extends URL {
  /** get current sessionId from url path. */
  get sessionId(): SessionId | undefined {
    const [_, maybeSession] = this.pathname.split('/')
    if (ids.isSessionId(maybeSession)) {
      return maybeSession
    }
  }

  /** get current clientId from url hash */
  get clientId(): ClientId | undefined {
    const fragment = this.hash
    if (ids.isClientId(fragment)) {
      return fragment
    }
  }

  constructor(hrefOrPath: string | SessionId, baseUrl = import.meta.env.SITE) {
    super(hrefOrPath, import.meta.env.SITE)
  }
}
