import { useAppContext } from '@/hooks/useAppContext'
import { useCurrentUrl } from './useCurrentUrl'
import { useCallback, useMemo } from 'react'
import { safe } from '@/lib/shared/safe-utils'

/**
 * Main application hook.
 */
export function useConsoleDump() {
  const url = useCurrentUrl()
  const app = useAppContext()

  const { sessionId, clientId } = useMemo(() => {
    return safe.getIdsFromUrl(url)
  }, [url])

  const redirectTo = useCallback((path: string) => {
    const win = safe.getWindow()
    if (!win) return
    win.location.href = path
  }, [])

  return {
    ...app,
    url,
    sessionId,
    clientId,
    redirectTo
  }
}
