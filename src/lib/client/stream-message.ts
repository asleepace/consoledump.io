type MessageType = 'connected' | 'message' | 'error' | 'closed' | 'system'


function dumpObject(obj: any): string {
  try {
  if (!obj) return String(obj)
  if (Array.isArray(obj)) {
    return obj.map((item) => dumpObject(item)).join(' ')
  }
  if (typeof obj === 'object') {
    return JSON.stringify(obj, null, 2)
  }
  if ('toString' in obj) {
    return obj.toString()
  }
  return String(obj)
} catch (e) {
  return String(obj)
} 
}


export class StreamMessage {
  public readonly json?: any
  public readonly text?: string
  public readonly time = new Date()
  public readonly type: MessageType = 'message'

  constructor(data: any) {
    try {
      this.text = String(data)
      this.json = JSON.parse(this.text)
      this.text = undefined
      if ('type' in this.json && typeof this.json.type === 'string') {
        this.type = this.json.type
      }
      console.log('[stream-message] json:', this.json)
    } catch (e) {
      console.warn('[stream-message] decoding issue:', e, data)
    }
  }

  public format(): string {
    if (this.type === 'connected') {
      const href = window.location.href
      return `client joined stream <a class="text-orange-300 underline" href="${href}">${href}<a>`
    }

    if (this.type === 'system') {
      return this.json.html
    }

    if (this.json) {
      return dumpObject(this.json)
    }


    return this.text ?? '<empty>'
  }

  public getTypeColor(): string {
    switch (this.type) {
      case 'system':
      case 'connected':
        return 'text-blue-300'
      case 'closed':
        return 'text-red-500'
      default:
        return 'text-neutral-600'
    }
  }
}
