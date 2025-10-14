import { ApiError } from './api-error'

/**
 * NOTE: See `.env.d.ts` for type definitions.
 *
 * This file exports helps for generating, creating, asserting
 * and checking ids.
 */

/**
 * 4-16 Alphanumeric Charss
 */
const sessionIdRegex = /^[A-Za-z0-9]{4,16}$/

/**
 * Example `0x00FF` (4 Chars)
 */
const clientIdRegex = /^0x[0-9A-F]{4}$/

//  --- common operations ---

export function generateSessionId(): SessionId {
  const randomId = crypto.randomUUID().slice(0, 6)
  return assertSessionId(randomId)
}

export function generateClientId(): ClientId {
  const bytes = crypto.getRandomValues(new Uint8Array(2))
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  const clientId = `0x${hex.toUpperCase()}` as ClientId
  return clientId
}

export function isSessionId(maybeId: unknown): maybeId is SessionId {
  return Boolean(maybeId && sessionIdRegex.test(String(maybeId)))
}

export function isClientId(maybeClientId: unknown): maybeClientId is ClientId {
  return Boolean(maybeClientId && clientIdRegex.test(String(maybeClientId)))
}

export function assertSessionId(
  sessionId: string | String | SessionId
): SessionId {
  if (!isSessionId(sessionId))
    throw new ApiError('Invalid sessionId.', { sessionId })
  return sessionId as SessionId
}

export function assertClientId(clientId: string | String | ClientId): ClientId {
  if (!isClientId(clientId))
    throw new ApiError('Invalid clientId.', { clientId })
  return clientId as ClientId
}

export function toSessionId(sessionId: string): SessionId {
  return sessionId as SessionId
}

export function toClientId(clientId: string): ClientId {
  return clientId as ClientId
}

/**
 * Shared utils for `SessionId` and `ClientId` types.
 */
export const ids = {
  generateClientId,
  generateSessionId,
  isClientId,
  isSessionId,
  assertClientId,
  assertSessionId,
  toClientId,
  toSessionId,
}

/** Checks if the provided id is a branded session id type. */

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

    const searchParamId = url.searchParams.get('id')
    if (isSessionId(searchParamId)) {
      return toSessionId(searchParamId)
    }

    const firstPath = url.pathname.split('/').at(1)
    if (isSessionId(firstPath)) {
      return toSessionId(firstPath)
    }

    const xSessionId = req.headers.get('x-session-id')
    if (isSessionId(xSessionId)) {
      return toSessionId(xSessionId)
    }

    const xStreamId = req.headers.get('x-stream-id')
    if (isSessionId(xStreamId)) {
      return toSessionId(xStreamId)
    }
  } catch (e) {
    console.warn('[getSessionId] err:', e)
    return undefined
  }
}
