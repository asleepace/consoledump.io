import { AppContextProvider, withAppProvider } from './AppContext'
import { Terminal } from 'lucide-react'
import { SiteTitle } from './SiteTitle'
import { AppNavigationBar } from './AppNavigationBar'
import { AppMessageContainer } from './AppMessageContainer'
import { useAppContext } from '@/hooks/useAppContext'

export type ConsoleDumpClientProps = {}

export const ConsoleDumpClient = withAppProvider((props: ConsoleDumpClientProps) => {
  const ctx = useAppContext()
  console.log('[ConsoleDumpClient] ctx:', ctx)

  return (
    <div className="w-full flex flex-1 flex-col bg-green-500">
      {/* --- site navigation --- */}
      <AppNavigationBar />

      {/* --- main context --- */}
      <AppMessageContainer />
    </div>
  )
})
