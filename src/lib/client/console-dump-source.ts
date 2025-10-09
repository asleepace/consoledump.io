import { events, type ClientInfo } from "@/lib/shared/event-schemas"


export interface ConsoleDumpConfig {
    sessionId: string
    onOpen?:(ev: Event) => void
    onMessage?:(ev: MessageEvent) => void
    onError?:(ev: Event) => void
}

type ConsoleDumpState = Record<string, any> & {
    clientId?: string
    messages: MessageEvent[]
}

/**
 * ## Console Dump Source (EventSource)
 * 
 * A simple wrapper around `EventSource` which handles application specific logic,
 * and is optimized to be used with react.
 */
export class ConsoleDumpSource extends EventSource {

    public state: ConsoleDumpState = {
        clientId: undefined,
        messages: []
    }

    public clientInfo?: ClientInfo['eventData']

    public get isReady() {
        return Boolean(this.isOpen && this.clientInfo?.clientId)
    }

    public get count() {
        return this.state.messages.length
    }

    public get isConnecting() {
        return this.readyState === this.CONNECTING
    }

    public get isOpen() {
        return this.readyState === this.OPEN
    }

    public get isClosed() {
        return this.readyState === this.CLOSED
    }

    public onFirstMessage = (ev: MessageEvent): boolean => {
        const meta = JSON.parse(ev.data)
        this.state.clientId = meta.clientId
        return true
    }

    public addClientListener(clientId: string) {
        this.addEventListener(clientId, (ev) => {
            const clientEvent = events.decodeMessageEvent(ev)
            console.log('[client]', clientEvent)
        })
    }

    constructor(public config: ConsoleDumpConfig) {
        super(`/api/sse?id=${config.sessionId}`)

        // application system broadcast
        this.addEventListener('system', (ev) => {
            const systemEvent = events.decodeSystemEvent(ev)

            // 0. first message contains client id and stream metadata
            if (systemEvent?.eventName === 'client:connected') {
                this.clientInfo = systemEvent.eventData
                this.addClientListener(systemEvent.eventData.clientId)
            }
        })

        // normal on open events
        this.onopen = (ev) => {
            this.config.onOpen?.(ev)
        }

        // general message events
        this.onmessage = (ev) => {
            this.onFirstMessage(ev)
            this.config.onMessage?.(ev)
        }

        // errors events
        this.onerror = (ev) => {
            this.config.onError?.(ev)
        }
    }
}
