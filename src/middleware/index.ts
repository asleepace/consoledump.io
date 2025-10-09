import { defineMiddleware } from 'astro:middleware'
import { ApiError } from '@/lib/server/api-error'
import { getSessionIdForRequest } from '@/lib/shared/session-id'

/**
 *  ## Middleware
 *
 *  This is the middleware handler for the application where we can specify
 *  if a page exists or not.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  try {
    /** extract sessionId from incoming url, path or headers. */
    const sessionId = getSessionIdForRequest(context.request)
    context.locals.sessionId = sessionId

    return await next()
  } catch (e) {
    return ApiError.from(e).toResponse()
  }
})
