// ============================================================================
// Types
// ============================================================================

export type MessageContent =
  | { type: 'array'; data: any[] }
  | { type: 'object'; data: object }

export type RenderContext = {
  renderers: ItemRenderer[]
  renderItem: (item: any) => string
}

export type ItemRenderer = (item: any, ctx: RenderContext) => string | null

export type PatternMatcher = {
  match: RegExp | ((msg: Message) => boolean)
  badgeName?: string
  className?: string
  renderer?: ItemRenderer
  only?: boolean
}

// ============================================================================
// Utilities
// ============================================================================

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// ============================================================================
// Default Renderers
// ============================================================================

const stringRenderer: ItemRenderer = (item) => {
  if (typeof item === 'string') {
    return `<span class="console-string">${escapeHtml(item)}</span>`
  }
  return null
}

const numberRenderer: ItemRenderer = (item) => {
  if (typeof item === 'number') {
    return `<span class="console-number">${item}</span>`
  }
  return null
}

const booleanRenderer: ItemRenderer = (item) => {
  if (typeof item === 'boolean') {
    return `<span class="console-boolean">${item}</span>`
  }
  return null
}

const nullRenderer: ItemRenderer = (item) => {
  if (item === null) {
    return `<span class="console-null">null</span>`
  }
  if (item === undefined) {
    return `<span class="console-undefined">undefined</span>`
  }
  return null
}

const errorRenderer: ItemRenderer = (item) => {
  if (item instanceof Error) {
    return `<span class="console-error">${escapeHtml(
      `${item.name}: ${item.message}`
    )}</span>`
  }
  return null
}

const dateRenderer: ItemRenderer = (item) => {
  if (item instanceof Date) {
    return `<span class="console-date">${escapeHtml(item.toISOString())}</span>`
  }
  return null
}

const arrayRenderer: ItemRenderer = (item, ctx) => {
  if (Array.isArray(item)) {
    const items = item.map((i) => ctx.renderItem(i)).join(', ')
    return `<span class="console-array">[${items}]</span>`
  }
  return null
}

const objectRenderer: ItemRenderer = (item) => {
  if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
    // Check if it's a plain object or has a constructor
    const isPlainObject =
      item.constructor === Object || item.constructor === undefined

    if (isPlainObject) {
      return `<span class="console-object">${escapeHtml(
        JSON.stringify(item, null, 2)
      )}</span>`
    }

    // For class instances, show constructor name
    const className = item.constructor?.name || 'Object'
    return `<span class="console-instance">${className} ${escapeHtml(
      JSON.stringify(item, null, 2)
    )}</span>`
  }
  return null
}

const defaultRenderers: ItemRenderer[] = [
  stringRenderer,
  numberRenderer,
  booleanRenderer,
  nullRenderer,
  errorRenderer,
  dateRenderer,
  arrayRenderer,
  objectRenderer,
]

// ============================================================================
// Message Renderer
// ============================================================================

export class MessageRenderer {
  private renderers: ItemRenderer[]

  constructor(customRenderers: ItemRenderer[] = []) {
    this.renderers = [...customRenderers, ...defaultRenderers]
  }

  public addRenderer(renderer: ItemRenderer): void {
    this.renderers.unshift(renderer)
  }

  public renderItem = (item: any): string => {
    const ctx: RenderContext = {
      renderers: this.renderers,
      renderItem: this.renderItem,
    }

    for (const renderer of this.renderers) {
      const result = renderer(item, ctx)
      if (result !== null) return result
    }

    // Fallback
    return `<span class="console-unknown">${escapeHtml(String(item))}</span>`
  }

  public render(content: MessageContent): string {
    if (content.type === 'array') {
      return content.data.map(this.renderItem).join(' ')
    }
    return this.renderItem(content.data)
  }
}

// ============================================================================
// Message Class
// ============================================================================

export class Message {
  static defaultConfig = {
    enableTimestampMs: false,
  }

  static defaultBadgeStyles: Record<string, string> = {
    error: 'badge-red',
    warn: 'badge-yellow',
    warning: 'badge-yellow',
    info: 'badge-blue',
    debug: 'badge-orange',
    log: 'badge-zinc',
    system: 'badge-emerald',
    connected: 'badge-emerald',
    client: 'badge-indigo',
    message: 'badge-zinc',
  }

  public readonly createdAt = new Date()
  public readonly id: string | undefined
  public readonly content: MessageContent
  public readonly classNames = new Set<string>()
  public badge = {
    name: 'message',
    className: 'badge-zinc',
  }

  private renderer: MessageRenderer

  constructor(public event: MessageEvent, renderer?: MessageRenderer) {
    this.id = event.lastEventId
    this.content = Message.parse(event.data)
    this.renderer = renderer || new MessageRenderer()
    this.setBadgeName(event.type)
  }

  static parse(data: any): MessageContent {
    // If already an object/array
    if (typeof data === 'object' && data !== null) {
      return {
        type: Array.isArray(data) ? 'array' : 'object',
        data,
      }
    }

    // If string, try to parse
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data)
        return {
          type: Array.isArray(parsed) ? 'array' : 'object',
          data: parsed,
        }
      } catch {
        // Plain string becomes single-item array
        return {
          type: 'array',
          data: [data],
        }
      }
    }

    // Primitives become single-item array
    return {
      type: 'array',
      data: [data],
    }
  }

  public get timestamp(): string {
    const hours = this.createdAt.getHours().toString().padStart(2, '0')
    const minutes = this.createdAt.getMinutes().toString().padStart(2, '0')
    const seconds = this.createdAt.getSeconds().toString().padStart(2, '0')

    if (Message.defaultConfig.enableTimestampMs) {
      const ms = this.createdAt.getMilliseconds().toString().padStart(3, '0')
      return `${hours}:${minutes}:${seconds}:${ms}`
    } else {
      return `${hours}:${minutes}:${seconds}`
    }
  }

  public get className(): string {
    return Array.from(this.classNames).join(' ')
  }

  public setBadgeName(badgeName?: string): void {
    if (!badgeName) return
    this.badge.name = badgeName
    this.badge.className = Message.defaultBadgeStyles[badgeName] ?? 'badge-zinc'
  }

  public addClassNames(...classNames: (string | undefined)[]): void {
    classNames.forEach((className) => {
      if (className) this.classNames.add(className)
    })
  }

  public setRenderer(renderer: MessageRenderer): void {
    this.renderer = renderer
  }

  public toHtml(): string {
    return this.renderer.render(this.content)
  }

  public get html(): string {
    return `<span data-name="${this.badge.name}">${this.toHtml()}</span>`
  }
}

// ============================================================================
// Pattern Matcher
// ============================================================================

export function createPatternMatcher(
  patterns: PatternMatcher[],
  customRenderers: ItemRenderer[] = []
) {
  const globalPatterns = Array.from(patterns)
  const globalRenderer = new MessageRenderer(customRenderers)

  function isMatch(pattern: PatternMatcher, message: Message): boolean {
    if (pattern.match instanceof RegExp) {
      // Test against the raw event data as string
      const rawData =
        typeof message.event.data === 'string'
          ? message.event.data
          : JSON.stringify(message.event.data)
      return pattern.match.test(rawData)
    }
    return pattern.match(message)
  }

  return {
    register(patternMatcher: PatternMatcher) {
      globalPatterns.push(patternMatcher)
    },
    getPatterns() {
      return globalPatterns
    },
    parse(event: MessageEvent): Message {
      const msg = new Message(event, globalRenderer)

      for (const pattern of globalPatterns) {
        if (isMatch(pattern, msg)) {
          // Apply custom renderer if provided
          if (pattern.renderer) {
            const patternRenderer = new MessageRenderer([
              pattern.renderer,
              ...customRenderers,
            ])
            msg.setRenderer(patternRenderer)
          }

          msg.addClassNames(pattern.className)
          msg.setBadgeName(pattern.badgeName)

          if (pattern.only) break
        }
      }

      return msg
    },
  }
}

// ============================================================================
// Shared Message Parser
// ============================================================================

export const messageParser = createPatternMatcher([
  {
    match: /(error:|\[error\])/gi,
    badgeName: 'error',
    className: 'text-red-500',
  },
  {
    match: /(warn:|\[warn\])/gi,
    badgeName: 'warn',
    className: 'text-yellow-400',
  },
  {
    match: /(info:|\[info\])/gi,
    badgeName: 'info',
    className: 'text-blue-400',
  },
  {
    match: /(debug:|\[debug\])/gi,
    badgeName: 'debug',
    className: 'text-orange-400',
  },
  { match: /(log:|\[log\])/gi, badgeName: 'log', className: 'text-zinc-400' },
])
