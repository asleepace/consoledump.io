export class TextData {
  public readonly classNames: Set<string> = new Set()
  public lowercased: string
  public badgeName: string = 'message'

  constructor(public raw: string) {
    this.lowercased = raw.trim().toLowerCase()
  }

  valueOf() {
    return this.raw
  }

  get html() {
    const classList = new Array(...this.classNames).join(' ')
    return `<span class="${classList}">${this.raw}</span>`
  }
}

type TextParser = (text: TextData) => void | boolean

export function createParser(...parsers: TextParser[]) {
  const registeredParsers: TextParser[] = [...parsers]

  return {
    registerParser(nextParser: TextParser) {
      registeredParsers.push(nextParser)
      return createParser(...registeredParsers)
    },
    parseText: (raw: string) => {
      console.log('[parsing] text:', raw)
      const text = new TextData(raw)
      for (const textParser of registeredParsers) {
        if (textParser(text)) break
      }
      return text
    },
  }
}

/**
 * Assorted list of text parsers.
 */
export const textParser = createParser()
  .registerParser((text) => {
    if (text.lowercased.includes('error')) {
      text.classNames.add('text-red-500')
      text.badgeName = 'error'
    }
  })
  .registerParser((text) => {
    if (text.lowercased.startsWith('warn')) {
      text.classNames.add('text-yellow-400')
      text.badgeName = 'warn'
    }
  })
  .registerParser((text) => {
    if (text.lowercased.startsWith('info')) {
      text.classNames.add('text-blue-400')
      text.badgeName = 'info'
    }
  })
  .registerParser((text) => {
    if (text.lowercased.startsWith('debug')) {
      text.classNames.add('text-orange-400')
      text.badgeName = 'debug'
    }
  })
