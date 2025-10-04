import { AppContext } from '@/components/react/AppContext'
import { use } from 'react'

/**
 * Hook which returns the current app context.
 */
export function useAppContext() {
  return use(AppContext)
}
