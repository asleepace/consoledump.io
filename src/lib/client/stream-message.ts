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

  static create(obj: any) {
    return new StreamMessage(JSON.stringify(obj))
  }

  constructor(data: any) {
    try {
      this.text = String(data)
      this.json = JSON.parse(this.text)
      this.text = undefined
      if ('type' in this.json && typeof this.json.type === 'string') {
        this.type = this.json.type
      }
      if (Array.isArray(this.json)) {
        console.log(...this.json)
      } else {
        console.log(this.json)
      }
    } catch (e) {
      console.log(this.text)
    }
  }

  public export() {
    if (this.type === 'system') return null
    const data = this.json || this.text || null
    if (!data) return null
    const compact = Array.isArray(data) ? data.flat(1) : data
    return Array.isArray(compact) ? compact : [compact]
  }

  public format(): string {
    if (this.type === 'connected') {
      const href = window.location.href
      return `client joined stream <a class="text-orange-400 underline" href="${href}">${href}<a>`
    }

    if (this.type === 'system') {
      return this.json.html
    }

    if (this.json) {
      return dumpObject(this.json)
    }

    return this.text ?? '<empty></empty>'
  }

  public getTypeColor(): string {
    switch (this.type) {
      case 'system':
      case 'connected':
        return 'text-blue-400'
      case 'closed':
        return 'text-red-400'
      default:
        return 'text-zinc-600'
    }
  }
}
