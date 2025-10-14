import React, { useEffect, useState } from 'react'

/**
 * Returns the value of an async operation.
 */
export function useAsyncEffect<T>(
  callbackFn: () => Promise<T>,
  deps: React.DependencyList
) {
  const [value, setValue] = useState<T | undefined>()

  useEffect(() => {
    callbackFn().then((res) => setValue(res))
  }, deps)

  return value
}
