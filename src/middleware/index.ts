import { defineMiddleware } from 'astro:middleware'
import { ApiError } from '@/lib/shared/api-error'
import { getSessionIdForRequest } from '@/lib/shared/ids'
import { fileUtils } from '@/lib/server/file-utils'
import { runGarbageCollection } from '@/lib/server/garbage-collector'

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

    await runGarbageCollection()

    return await next()
  } catch (e) {
    return ApiError.from(e).toResponse()
  }
})
