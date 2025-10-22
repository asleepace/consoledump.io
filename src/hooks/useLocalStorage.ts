import { useEffect, useCallback, useRef } from 'react'
import type { SessionMeta } from './useEventStream'

// Storage keys
const STORAGE_KEYS = {
  SETTINGS: 'consoledump:settings',
  MESSAGES: 'consoledump:messages',
  METADATA: 'consoledump:metadata',
  SESSION_STATE: 'consoledump:session-state',
} as const

// Types for stored data
export interface StoredMessage {
  id: string
  data: string
  timestamp: number
  type?: 'message' | 'system'
}

export interface StoredMetadata extends SessionMeta {
  lastSaved: number
  messageCount: number
}

export interface SessionState {
  sessionId: string
  expandedLogs: string[]
  lastActive: number
}

export interface LocalStorageData {
  settings: Record<string, any>
  messages: StoredMessage[]
  metadata: StoredMetadata | null
  sessionState: SessionState | null
}

/**
 * Hook for managing local storage persistence
 * Handles saving and loading of settings, messages, and metadata
 */
export function useLocalStorage() {
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const isClient = typeof window !== 'undefined'

  /**
   * Generic storage getter with error handling
   */
  const getItem = useCallback(
    <T>(key: string, defaultValue: T): T => {
      if (!isClient) return defaultValue

      try {
        const item = localStorage.getItem(key)
        return item ? JSON.parse(item) : defaultValue
      } catch (error) {
        console.error(`[LocalStorage] Failed to get ${key}:`, error)
        return defaultValue
      }
    },
    [isClient]
  )

  /**
   * Generic storage setter with error handling
   */
  const setItem = useCallback(
    <T>(key: string, value: T): boolean => {
      if (!isClient) return false

      try {
        localStorage.setItem(key, JSON.stringify(value))
        return true
      } catch (error) {
        console.error(`[LocalStorage] Failed to set ${key}:`, error)

        // Handle quota exceeded errors
        if (
          error instanceof DOMException &&
          error.name === 'QuotaExceededError'
        ) {
          console.warn(
            '[LocalStorage] Storage quota exceeded. Please clear old data manually.'
          )
        }

        return false
      }
    },
    [isClient]
  )

  /**
   * Remove item from storage
   */
  const removeItem = useCallback(
    (key: string): void => {
      if (!isClient) return

      try {
        localStorage.removeItem(key)
      } catch (error) {
        console.error(`[LocalStorage] Failed to remove ${key}:`, error)
      }
    },
    [isClient]
  )

  /**
   * Save settings to local storage
   */
  const saveSettings = useCallback(
    (settings: Record<string, any>): boolean => {
      return setItem(STORAGE_KEYS.SETTINGS, settings)
    },
    [setItem]
  )

  /**
   * Load settings from local storage
   */
  const loadSettings = useCallback((): Record<string, any> | null => {
    return getItem(STORAGE_KEYS.SETTINGS, null)
  }, [getItem])

  /**
   * Save messages to local storage (with debouncing)
   */
  const saveMessages = useCallback(
    (messages: MessageEvent<string>[], debounce = true): boolean => {
      const storedMessages: StoredMessage[] = messages.map((msg, index) => ({
        id: `msg-${Date.now()}-${index}`,
        data: msg.data,
        timestamp: Date.now(),
        type: msg.type === 'system' ? 'system' : 'message',
      }))

      if (debounce) {
        // Debounce saves to avoid excessive writes
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current)
        }

        saveTimeoutRef.current = setTimeout(() => {
          setItem(STORAGE_KEYS.MESSAGES, storedMessages)
        }, 1000)

        return true
      }

      return setItem(STORAGE_KEYS.MESSAGES, storedMessages)
    },
    [setItem]
  )

  /**
   * Load messages from local storage
   */
  const loadMessages = useCallback((): StoredMessage[] => {
    return getItem(STORAGE_KEYS.MESSAGES, [])
  }, [getItem])

  /**
   * Save session metadata
   */
  const saveMetadata = useCallback(
    (meta: SessionMeta, messageCount: number): boolean => {
      const storedMeta: StoredMetadata = {
        ...meta,
        lastSaved: Date.now(),
        messageCount,
      }
      return setItem(STORAGE_KEYS.METADATA, storedMeta)
    },
    [setItem]
  )

  /**
   * Load session metadata
   */
  const loadMetadata = useCallback((): StoredMetadata | null => {
    return getItem(STORAGE_KEYS.METADATA, null)
  }, [getItem])

  /**
   * Save session state (expanded logs, etc.)
   */
  const saveSessionState = useCallback(
    (sessionId: string, expandedLogs: Set<string>): boolean => {
      const state: SessionState = {
        sessionId,
        expandedLogs: Array.from(expandedLogs),
        lastActive: Date.now(),
      }
      return setItem(STORAGE_KEYS.SESSION_STATE, state)
    },
    [setItem]
  )

  /**
   * Load session state
   */
  const loadSessionState = useCallback((): SessionState | null => {
    return getItem(STORAGE_KEYS.SESSION_STATE, null)
  }, [getItem])

  /**
   * Clear old messages (keep only last 1000 or from last 7 days)
   */
  const clearOldMessages = useCallback((): void => {
    const messages = loadMessages()
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

    const recentMessages = messages
      .filter((msg) => msg.timestamp > sevenDaysAgo)
      .slice(-1000) // Keep only last 1000 messages

    setItem(STORAGE_KEYS.MESSAGES, recentMessages)
  }, [loadMessages, setItem])

  /**
   * Clear all stored data
   */
  const clearAll = useCallback((): void => {
    Object.values(STORAGE_KEYS).forEach((key) => {
      removeItem(key)
    })
  }, [removeItem])

  /**
   * Clear only messages (keep settings)
   */
  const clearMessages = useCallback((): void => {
    removeItem(STORAGE_KEYS.MESSAGES)
    removeItem(STORAGE_KEYS.METADATA)
  }, [removeItem])

  /**
   * Get storage usage info
   */
  const getStorageInfo = useCallback((): {
    used: number
    total: number
    percentage: number
    breakdown: Record<string, number>
  } => {
    if (!isClient) {
      return { used: 0, total: 0, percentage: 0, breakdown: {} }
    }

    const breakdown: Record<string, number> = {}
    let totalUsed = 0

    Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
      const item = localStorage.getItem(key)
      const size = item ? new Blob([item]).size : 0
      breakdown[name] = size
      totalUsed += size
    })

    // Estimate total available (usually 5-10MB)
    const estimatedTotal = 5 * 1024 * 1024 // 5MB

    return {
      used: totalUsed,
      total: estimatedTotal,
      percentage: (totalUsed / estimatedTotal) * 100,
      breakdown,
    }
  }, [isClient])

  /**
   * Export all data as JSON
   */
  const exportData = useCallback((): LocalStorageData => {
    return {
      settings: loadSettings() || {},
      messages: loadMessages(),
      metadata: loadMetadata(),
      sessionState: loadSessionState(),
    }
  }, [loadSettings, loadMessages, loadMetadata, loadSessionState])

  /**
   * Import data from JSON
   */
  const importData = useCallback(
    (data: Partial<LocalStorageData>): boolean => {
      try {
        if (data.settings) saveSettings(data.settings)
        if (data.messages) setItem(STORAGE_KEYS.MESSAGES, data.messages)
        if (data.metadata) setItem(STORAGE_KEYS.METADATA, data.metadata)
        if (data.sessionState)
          setItem(STORAGE_KEYS.SESSION_STATE, data.sessionState)
        return true
      } catch (error) {
        console.error('[LocalStorage] Failed to import data:', error)
        return false
      }
    },
    [saveSettings, setItem]
  )

  /**
   * Auto-cleanup on mount (remove old data)
   */
  useEffect(() => {
    if (!isClient) return

    // Clean up old messages periodically
    const cleanup = () => {
      const state = loadSessionState()
      if (state) {
        const daysSinceLastActive =
          (Date.now() - state.lastActive) / (1000 * 60 * 60 * 24)

        // Clear messages if session inactive for more than 7 days
        if (daysSinceLastActive > 7) {
          console.log('[LocalStorage] Clearing old session data')
          clearMessages()
        }
      }
    }

    cleanup()
  }, [isClient, loadSessionState, clearMessages])

  /**
   * Cleanup timeout on unmount
   */
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  return {
    // Settings
    saveSettings,
    loadSettings,

    // Messages
    saveMessages,
    loadMessages,
    clearMessages,
    clearOldMessages,

    // Metadata
    saveMetadata,
    loadMetadata,

    // Session state
    saveSessionState,
    loadSessionState,

    // Utilities
    clearAll,
    getStorageInfo,
    exportData,
    importData,

    // Low-level access
    getItem,
    setItem,
    removeItem,
  }
}
