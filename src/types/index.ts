/**
 * Checks if the data has the given key.
 */
export function has<T = any>(data: any, key: string): data is { [key]: T } {
  if (!data || typeof data !== 'object') return false
  return Boolean(key in data && data[key])
}

export function is<T>(data: T | undefined | null): data is NonNullable<T> {
  return Boolean(data)
}
