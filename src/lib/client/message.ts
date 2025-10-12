export type ContentType = 'data::string' | 'json::object' | 'json::arrary'

export class Message {
  static textEncode(data: object): string {
    try {
      if (typeof data === 'string') return data
      if (data instanceof Date)
        return data.toLocaleDateString('en-US', { dateStyle: 'medium' })
      if (data instanceof Error)
        return `${data.name ?? 'Error'}: ${data.message}`
      return JSON.stringify(data)
    } catch (e) {
      return String(data)
    }
  }

  static encodeJson(object: object | object[], seperator = ',') {
    if (Array.isArray(object)) {
      return object.map((item) => Message.textEncode(item)).join(seperator)
    } else {
      return Message.textEncode(object)
    }
  }

  static decodeJson<T>(jsonString: string): T | undefined {
    try {
      return JSON.parse(jsonString)
    } catch (e) {
      return undefined
    }
  }

  static defaultBadgeStyles: Record<string, string> = {
    error: 'badge-red',
    warn: 'badge-yellow',
    warning: 'badge-yellow',
    info: 'badge-blue',
    debug: 'badge-orange',
    system: 'badge-emerald',
    connected: 'badge-emerald',
    client: 'badge-indigo',
    message: 'badge-zinc',
  }

  public contentType: ContentType = 'data::string'
  public createdAt = new Date()
  public classNames = new Set<string>()
  public badge = {
    name: 'message',
    className: 'badge-zinc',
  }
  public json?: object
  public text: string

  public get timestamp() {
    return this.createdAt.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  constructor(public event: MessageEvent) {
    if (typeof event.data === 'string') {
      this.text = event.data
      this.json = Message.decodeJson(event.data)
      if (this.json && Array.isArray(this.json)) {
        this.contentType = 'json::arrary'
      } else if (this.json) {
        this.contentType = 'json::object'
      }
    } else {
      this.text = Message.textEncode(event.data)
      this.json = event.data
    }
    this.setBadgeName(event.type)
  }

  public setBadgeName(badgeName?: string) {
    if (!badgeName) return
    this.badge.name = badgeName
    this.badge.className = Message.defaultBadgeStyles[badgeName] ?? 'badge-zinc'
  }

  public addClassName(className?: string) {
    if (!className) return
    this.classNames.add(className)
  }

  public get className(): string {
    return Array.from(this.classNames).join(' ')
  }

  public setToString(toHtmlString: (this: Message) => string) {
    this.toHtml = toHtmlString.bind(this)
  }

  public toHtml = () => {
    if (this.contentType === 'data::string') return this.text
    if (this.contentType === 'json::object')
      return Message.textEncode(this.json as any)
    if (this.contentType === 'json::arrary')
      return Message.encodeJson(this.json as any)
    return this.text
  }

  public get textContent() {
    return this.toHtml.call(this)
  }

  public get html() {
    return `<span data-name="${this.badge.name}">${this.textContent}</span>`
  }
}
