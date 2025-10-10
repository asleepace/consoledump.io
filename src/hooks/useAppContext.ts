import { use } from 'react'
import { AppContext, type AppCtx } from '@/components/react/AppContext'
export type { AppCtx } from '@/components/react/AppContext'

/**
 * Hook which returns the current app context.
 *
 * @see {@link AppContext}
 */
export function useAppContext(): AppCtx {
  return use(AppContext)
}
