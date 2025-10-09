import { ApiError } from '../server/api-error'

/** unique session id branded symbol. */
export const __sessionIdSymbol = Symbol('__session_id__')

/** sessionIds are 4-16 character long alphanumber strings. */
const sessionIdRegex = /^[A-Za-z0-9]{4,16}$/

/** branded type which represents a sessionId. */
export type SessionId = string & {
  [__sessionIdSymbol]: true
}

/** creates a new session id from the given data. */
export function SessionID(id: string | String | SessionId, info: string = 'generic') {
  if (!id || !sessionIdRegex.test(id.toString()))
    throw new ApiError('Invalid sessionId.', { id })
  if (!isValidSessionId(id)) throw new ApiError('Invalid sessionId.', { id })
  const sessionId = String(id) as unknown as SessionId
  return sessionId
}

/** checks if the given item is a valid session id. */
export function isValidSessionId(maybeId: unknown): maybeId is SessionId {
  if (!maybeId || maybeId === 'null' || maybeId === 'undefined') return false
  if (typeof maybeId !== 'string') return false
  return sessionIdRegex.test(maybeId)
}

/** Checks if the provided id is a branded session id type. */
export function isSessionId(maybeId: unknown): maybeId is SessionId {
    return Boolean(__sessionIdSymbol in (maybeId as SessionId))
}

/** 
 * Extract a sessionId from an incoming request, by checking the following:
 * 
 *  1. Check url for `?id=<session_id>`
 *  2. Check pathname for `/<session_id>`
 *  3. Check headers = `x-session-id` or `x-stream-id`
 * 
 * @note this does not throw and will return `undefined` if none found.
*/
export function getSessionIdForRequest(req: Request): SessionId | undefined {
  try {
    const url = new URL(req.url)

    // attempt to extract from url params
    const searchParamId = url.searchParams.get('id')
    if (isValidSessionId(searchParamId)) {
      return SessionID(searchParamId, 'search-param')
    }

    // attempt to extract from pathname
    const [firstPath] = url.pathname.split('/').filter(Boolean)
    if (isValidSessionId(firstPath)) {
        return SessionID(firstPath, 'path')
    }

    // attempt to extract from X-Session-Id header
    const xSessionId = req.headers.get('x-session-id')
    if (isValidSessionId(xSessionId)) {
        return SessionID(xSessionId, 'x-session-id')
    }

    // attempt to extract from X-Stream-Id header (legacy)
    const xStreamId = req.headers.get('x-stream-id')
    if (isValidSessionId(xStreamId)) {
        return SessionID(xStreamId, 'x-stream-id')
    }
  } catch (e) {
    console.warn('[getSessionId] err:', e)
    return undefined
  }
}
