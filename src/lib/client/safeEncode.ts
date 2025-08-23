




import { Try } from '@asleepace/try'


export interface EncodedMessage {
    encoding: 'json' | 'text' | 'binary'
}


export function decode(ev: MessageEvent) {
    return Try.catch(() => {

    })
}

export function encode(...args: any[]) {
    const textEncoder = new TextEncoder()
    return Try.catch(() => {

    })
}