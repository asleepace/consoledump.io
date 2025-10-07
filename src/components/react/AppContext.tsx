import React, { createContext, useEffect, useState, type PropsWithChildren } from 'react'
import { use } from 'react'
import { useEventStream, type ClientStream } from '@/components/react/useEventStream'
import { useClient } from './useClient'

/**
 * Hook which returns the current app context.
 */
export function useAppContext() {
  return use(AppContext)
}

export type AppTheme = {
  mode: 'light' | 'dark'
  bg: string
  card: string
  border: string
  hover: string
  text: string
  textMuted: string
  input: string
  button: string
  code: string
}

const AppThemes: Record<AppTheme['mode'], AppTheme> = {
  dark: {
    mode: 'dark',
    bg: 'bg-gray-950',
    card: 'bg-gray-900',
    border: 'border-gray-900',
    hover: 'hover:bg-gray-800/50',
    text: 'text-gray-100',
    textMuted: 'text-gray-400',
    input: 'bg-gray-800 border-gray-700',
    button: 'bg-gray-800 border-gray-700 hover:border-blue-500',
    code: 'bg-gray-800',
  },
  light: {
    mode: 'light',
    bg: 'bg-gray-50',
    card: 'bg-white',
    border: 'border-gray-200',
    hover: 'hover:bg-gray-100',
    text: 'text-gray-900',
    textMuted: 'text-gray-600',
    input: 'bg-white border-gray-300',
    button: 'bg-white border-gray-300 hover:border-blue-500',
    code: 'bg-gray-100',
  },
}

type SetState<T> = React.Dispatch<React.SetStateAction<T>>

// --- context types ---

export type AppCtx = {
  theme: AppTheme
  copiedId: string | undefined
  searchTerm: string | undefined
  sessionId: string | undefined
  isConnected: boolean
  isDark: boolean
  expandedLogs: Set<string>
  stream: ClientStream | undefined
  setTheme: (mode: AppTheme['mode']) => void
  setCopiedId: SetState<string | undefined>
  setSearchTerm: SetState<string | undefined>
  setIsConnected: SetState<boolean>
  setExpandedLogs: SetState<Set<string>>

  /** helpers */
  toggleExpand(id: string): void
  copyToClipboard(logEntry: { content: string; id: string }): void
}

// --- default app context ---

export const AppContext = createContext<AppCtx>({
  theme: AppThemes.dark,
  copiedId: undefined,
  searchTerm: undefined,
  isConnected: false,
  isDark: false,
  expandedLogs: new Set(),
  sessionId: undefined,
  stream: undefined,
  setTheme() {},
  setCopiedId() {},
  setSearchTerm() {},
  setIsConnected() {},
  setExpandedLogs() {},
  toggleExpand() {},
  copyToClipboard() {},
})

// --- app context provider ---

export function AppContextProvider(props: PropsWithChildren<{ sessionId?: string }>) {
  const [theme, setTheme] = useState(AppThemes.dark)
  const [copiedId, setCopiedId] = useState<string | undefined>()
  const [searchTerm, setSearchTerm] = useState<string | undefined>()
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())

  const client = useClient()
  const isDark = theme.mode === 'dark'

  console.log('[AppContext] sessionId:', client.sessionId)

  // NOTE: Parse incoming messages here...
  const stream = useEventStream({
    logEvents: true,
  })

  return (
    <AppContext.Provider
      value={{
        stream,
        theme,
        copiedId,
        searchTerm,
        isConnected,
        sessionId: client.sessionId,
        isDark,
        expandedLogs,
        setTheme: (mode) => setTheme(AppThemes[mode]),
        setCopiedId,
        setSearchTerm,
        setIsConnected,
        setExpandedLogs,
        toggleExpand: (id: string) => {
          console.log('[AppContext] toggle expand:', id)
          const next = new Set(expandedLogs)
          if (next.has(id)) {
            next.delete(id)
          } else {
            next.add(id)
          }
          setExpandedLogs(next)
        },
        copyToClipboard(logEntry) {
          navigator.clipboard.writeText(logEntry.content)
          setCopiedId(logEntry.id)
          setTimeout(() => setCopiedId(undefined), 2000)
        },
      }}
    >
      {props.children}
    </AppContext.Provider>
  )
}

// --- hoc wrapper ---

export function withAppProvider<T extends {}>(Elem: (props: T) => React.ReactElement<T>) {
  return (props: T) => (
    <AppContextProvider>
      <Elem {...props} />
    </AppContextProvider>
  )
}
