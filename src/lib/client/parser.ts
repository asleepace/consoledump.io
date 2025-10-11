console.clear()

function tryParseJson<T = any>(data: string): T | undefined {
  try {
    return JSON.parse(data)
  } catch (e) {
    return undefined
  }
}

function textEncode(data: object): string {
  try {
    if (typeof data === 'string') return data
    if (data instanceof Date)
      return data.toLocaleDateString('en-US', { dateStyle: 'medium' })
    if (data instanceof Error) return `${data.name ?? 'Error'}: ${data.message}`
    return JSON.stringify(data)
  } catch (e) {
    return String(data)
  }
}

export type ContentType = 'data::string' | 'json::object' | 'json::arrary'

export type ContentChunk = {
  type: ContentType
  data: string | object[] | object
}

export class Message {
  static defulatBadgeStyles: Record<string, string> = {
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
  public raw: string

  public get timestamp() {
    return this.createdAt.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  constructor(public event: MessageEvent) {
    let rawText: string
    if (typeof event.data === 'string') {
      rawText = event.data
    } else {
      rawText = textEncode(event.data)
    }

    this.setBadgeName(event.type)
    this.raw = rawText

    const jsonData = tryParseJson(event.data)

    switch (true) {
      case Boolean(jsonData && Array.isArray(jsonData)): {
        this.contentType = 'json::arrary'
        this.json = jsonData
        break
      }
      case Boolean(jsonData): {
        this.contentType = 'json::object'
        this.json
        break
      }
    }
  }

  public setBadgeName(badgeName?: string) {
    if (!badgeName) return
    this.badge.name = badgeName
    this.badge.className = Message.defulatBadgeStyles[badgeName] ?? 'badge-zinc'
  }

  public addClassNames(className?: string) {
    if (!className) return
    this.classNames.add(className)
  }

  public getClassName() {
    return new Array(...this.classNames).join(' ')
  }

  public get textContent() {
    if (this.contentType === 'data::string') return this.raw
    if (this.contentType === 'json::object') {
      return JSON.stringify(this.raw)
    }
    if (this.contentType === 'json::arrary') {
      return (this.json as any[])
        .map((item) => {
          return textEncode(item)
        })
        .join(', ')
    }
    return String(this.raw)
  }

  public get html() {
    return `<span data-name="${
      this.badge.className
    }" class="${this.getClassName()}">${this.textContent}</span>`
  }
}

export type PatternMatcher = {
  match: RegExp | ((msg: Message) => boolean)
  className?: string
  badgeName?: string
  only?: boolean
}

export function createPatternMatcher(patternMatchers: PatternMatcher[]) {
  function isMatch(pattern: PatternMatcher, message: Message): boolean {
    if (pattern.match instanceof RegExp) {
      return pattern.match.test(message.raw)
    } else {
      return pattern.match(message)
    }
  }

  return {
    parse(event: MessageEvent) {
      const msg = new Message(event)
      for (const pattern of patternMatchers) {
        // check if pattern is matched
        if (isMatch(pattern, msg)) {
          msg.addClassNames(pattern.className)
          msg.setBadgeName(pattern.badgeName)
          if (pattern.only) break
        }
      }
      return msg
    },
  }
}
