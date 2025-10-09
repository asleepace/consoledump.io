import { Try } from "@asleepace/try";
import { z } from "astro/zod";

// --- helpers ---

const getJsonSafe = (json: string) => Try.catch(() => JSON.parse(json)).value

// --- message events ---

/**
 * ## Message Data
 * 
 * Message schema can take many shapes as it is sent by the client,
 * but most data will be a `json/array`.
 * 
 * ```ts
 * eventSource.onmessage = (ev: MessageEvent) => {
 *   const msg = MessageDataSchema.parse(ev.data)
 * }
 * ```
 * 
 * @note this is different than system or client messages.
 */
export const MessageDataSchema = z.string().transform((data) => {
    const json = getJsonSafe(data)
    // handle case where we received non-json data
    if (!json) return { eventType: 'text/basic', eventData: data }
    // most data sent is a json array with text, numbers, etc.
    if (Array.isArray(json)) {
        return { eventType: 'json/array', eventData: json }
    }
    // allow sender to dispatch custom event
    if ('eventType' in json && typeof json.eventType === 'string') {
        return { eventType: json.eventType, eventData: json }
    }
    // otherwise object is a json object
    return { eventType: 'json/object', eventData: json }
})

export type MessageData = z.infer<typeof MessageDataSchema>

export const MessageTypes = z.enum(['message', 'system', 'client'])

export const MessageSchema = z.object({
    id: z.string().optional(),
    type: MessageTypes,
    data: MessageDataSchema,
})

export type Message = z.infer<typeof MessageSchema>

// --- system events ---

export const ClientConnectedSchema = z.object({
    eventName: z.literal('client:connected'),
    eventData: z.object({
        streamId: z.string(),
        clientId: z.string(),
        createdAt: z.coerce.date(),
        updatedAt: z.coerce.date(),
        clients: z.number(), 
    })
})

export const ClientClosedSchema = z.object({
    eventName: z.literal('client:closed'),
    eventData: z.object({
        clientId: z.string()
    })
})

export const StreamClosedSchema = z.object({
    eventName: z.literal('stream:closed'),
    eventData: z.object({
        streamId: z.string() // fixed typo: stremId -> streamId
    })
})

export const SystemEvents = z.discriminatedUnion('eventName', [
    ClientConnectedSchema,
    ClientClosedSchema,
    StreamClosedSchema,
])

export type SystemEvent = z.infer<typeof SystemEvents>

export type ClientInfo = z.infer<typeof ClientConnectedSchema> 

// --- event utilities ---

export const events = {
    // --- system events ---
    decodeSystemEvent(ev: MessageEvent): SystemEvent | undefined {
        const json = getJsonSafe(ev.data)
        return SystemEvents.safeParse(json).data
    },
    
    encodeSystemEvent(systemEvent: SystemEvent): string {
        return JSON.stringify(systemEvent)
    },
    
    // --- basic messages ---
    decodeMessageEvent(ev: MessageEvent): Message | undefined {
        const parsed = MessageSchema.safeParse({
            id: ev.lastEventId || undefined,
            type: ev.type,
            data: ev.data
        })
        return parsed.data
    }
}