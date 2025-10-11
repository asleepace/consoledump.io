import { Try } from '@asleepace/try'
import { ids } from './ids'

export function safeDecodeJson<T = any>(jsonString: string): T | undefined {
  return Try.catch(() => JSON.parse(jsonString) as T).value
}

export function safeEncodeJson(jsonData: object): string | undefined {
  return Try.catch(() => JSON.stringify(jsonData)).value
}

export function safeUrl(
  hrefOrPath: string,
  baseUrl?: string
): URL | undefined {
  return Try.catch(() => new URL(hrefOrPath, baseUrl)).value
}

export function safeParseInt(value: string, radix?: number): number | undefined {
  const result = parseInt(value, radix)
  return isNaN(result) ? undefined : result
}

export function safeParseFloat(value: string): number | undefined {
  const result = parseFloat(value)
  return isNaN(result) ? undefined : result
}

export function safeGetWindow(): Window | undefined {
  if (typeof window === 'undefined') return undefined
  return window
}

export function safeGetDocument(): Document | undefined {
  if (typeof document === 'undefined') return undefined
  return document
}

export function safeLocalStorageGet(key: string): string | undefined {
  return Try.catch(() => localStorage.getItem(key) ?? undefined).value
}

export function safeLocalStorageSet(key: string, value: string): boolean {
  return Try.catch(() => {
    localStorage.setItem(key, value)
    return true
  }).value ?? false
}

export function safeSessionStorageGet(key: string): string | undefined {
  return Try.catch(() => sessionStorage.getItem(key) ?? undefined).value
}

export function safeSessionStorageSet(key: string, value: string): boolean {
  return Try.catch(() => {
    sessionStorage.setItem(key, value)
    return true
  }).value ?? false
}

export function safeGetIdsFromUrl(url: URL) {
  const [_, firstPath] = url.pathname.split('/')
  return {
    sessionId: ids.isSessionId(firstPath) ? firstPath : undefined,
    clientId: ids.isClientId(url.hash) ? url.hash : undefined,
  }
}

// Remove potentially dangerous patterns
const dangerousCodeRegex = [
  /import\s+/gi,
  /require\s*\(/gi,
  /eval\s*\(/gi,
  /Function\s*\(/gi,
  /setTimeout/gi,
  /setInterval/gi,
  /fetch/gi,
  /XMLHttpRequest/gi,
  /document\./gi,
  /window\./gi,
  /__proto__/gi,
  /constructor/gi,
  /process\./gi,
  /global\./gi,
]

export function safeEval<T = any>(code: string): T | undefined {
  return Try.catch(() => {
    for (const pattern of dangerousCodeRegex) {
      if (pattern.test(code)) {
        console.warn('[safe-util] blocked unsafe eval!')
        throw new Error('Potentially unsafe code detected')
      }
    }
    // Run in isolated context
    return Function(`"use strict"; return (${code})`)() as T
  }).value
}

export function getUrlWithId(sessionId: string) {
  return new URL(sessionId ?? '/', safeGetWindow()?.location.origin)
}

/** Various utils for safe(r) operations. */
export const safe = {
  decodeJson: safeDecodeJson,
  encodeJson: safeEncodeJson,
  eval: safeEval,
  getDocument: safeGetDocument,
  getWindow: safeGetWindow,
  localStorageGet: safeLocalStorageGet,
  localStorageSet: safeLocalStorageSet,
  parseFloat: safeParseFloat,
  parseInt: safeParseInt,
  sessionStorageGet: safeSessionStorageGet,
  sessionStorageSet: safeSessionStorageSet,
  getIdsFromUrl: safeGetIdsFromUrl,
  getUrlWithId,
  url: safeUrl,
}