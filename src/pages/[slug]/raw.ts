import { ApiError } from '@/lib/server/api-error'
import { Try } from '@asleepace/try'
import type { APIRoute } from 'astro'


type EventDataItem = {
  id?: number
  type?: string
  data?: string | object
}

function createEmptyItem(): EventDataItem {
  return { id: undefined, type: undefined, data: undefined }
}

function parseFileToJson(fileText: string) {
  const events = fileText.split('\n\n')
  return events.map((eventData) => {
    const components = eventData.split('\n')
    return components.reduce((item, field): EventDataItem => {
      // parse id field
      if (field.startsWith('id:')) {
        const idData = field.slice(3).trim()
        item.id = Number(idData)
      // parse type field
      } else if (field.startsWith('type:')) {
        const typeData = field.slice(5).trim()
        item.type = typeData
      // parse data field
      } else if (field.startsWith('data: ')) {
        const eventData = field.slice(5).trim()

        const maybeJson = Try.catch(() => JSON.parse(eventData))
        if (maybeJson.ok) {
          item.data = maybeJson.value
        } else {
          item.data = eventData
        }
      }

      return item
    }, createEmptyItem())
  }).filter((item) => Boolean(item.data || item.id || item.type))
}


/**
 * GET /<session_id>/raw
 * 
 * Downloads the contents of the dump session as plain text or JSON.
 * 
 * @note make sure to sanitized the filePath first!
 */
export const GET: APIRoute = async ({ url, request, params }) => {
  const fileType = url.searchParams.get('type') ?? 'application/json'
  const sessionId = params.slug
  if (!sessionId) {
    throw new ApiError({ error: 'Missing sessionId!' })
  }

  const isValidPath = /^[A-Za-z0-9_-]+$/.test(sessionId)
  if (!isValidPath) {
      throw new ApiError({ error: 'Invalid sessionId!' })
  }
  
  const rawFile = Bun.file(`./public/dumps/${sessionId}.log`)
  
  if (!await rawFile.exists()) {
      throw new ApiError({ error: 'File not found!' })
  }

  const fileText = await rawFile.text()
  // const fileJson = parseFileToJson(fileText)

  return Response.json(fileText, {
      headers: { 'content-type': 'plain/text' }
  })
}
