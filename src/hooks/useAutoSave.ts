import { useEffect, useRef } from 'react'
import { useLocalStorage } from './useLocalStorage'
import type { AppSettings } from './useSettings'
import type { ClientStream } from './useEventStream'

/**
 * Hook that automatically saves app state to local storage
 * Only active when "Save Locally" setting is enabled
 */
export function useAutoSave({
  settings,
  stream,
  expandedLogs,
  enabled = true,
}: {
  settings: AppSettings['settings']
  stream: ClientStream | undefined
  expandedLogs: Set<string>
  enabled?: boolean
}) {
  const storage = useLocalStorage()
  const previousSettingsRef = useRef(settings)
  const previousMessagesCountRef = useRef(0)

  /**
   * Save settings whenever they change
   */
  useEffect(() => {
    if (!enabled || !settings.saveLocally) return

    // Only save if settings actually changed
    if (
      JSON.stringify(settings) !== JSON.stringify(previousSettingsRef.current)
    ) {
      const success = storage.saveSettings(settings)
      if (success) {
        console.log('[AutoSave] Settings saved')
      }
      previousSettingsRef.current = settings
    }
  }, [settings, enabled, storage])

  /**
   * Save messages and metadata periodically
   */
  useEffect(() => {
    if (!enabled || !settings.saveLocally || !stream) return

    const messageCount = stream.events.length

    // Save messages (debounced)
    if (messageCount > 0 && messageCount !== previousMessagesCountRef.current) {
      storage.saveMessages(stream.events, true)
      previousMessagesCountRef.current = messageCount
      console.log(`[AutoSave] Saved ${messageCount} messages`)
    }

    // Save metadata if available
    if (stream.meta) {
      storage.saveMetadata(stream.meta, messageCount)
    }
  }, [
    stream?.events.length,
    stream?.meta,
    enabled,
    settings.saveLocally,
    storage,
  ])

  /**
   * Save session state (expanded logs)
   */
  useEffect(() => {
    if (!enabled || !settings.saveLocally || !stream?.sessionId) return

    storage.saveSessionState(stream.sessionId, expandedLogs)
  }, [expandedLogs, stream?.sessionId, enabled, settings.saveLocally, storage])

  /**
   * Auto-cleanup old messages on mount
   */
  useEffect(() => {
    if (!enabled || !settings.saveLocally) return

    const info = storage.getStorageInfo()

    // If storage is over 80% full, clear old messages
    if (info.percentage > 80) {
      console.warn(
        '[AutoSave] Storage almost full, cleaning up old messages...'
      )
      storage.clearOldMessages()
    }
  }, [enabled, settings.saveLocally, storage])

  return storage
}

/**
 * Hook to restore saved state on mount
 */
export function useRestoreState() {
  const storage = useLocalStorage()

  const restoreSettings = () => {
    return storage.loadSettings()
  }

  const restoreMessages = () => {
    return storage.loadMessages()
  }

  const restoreMetadata = () => {
    return storage.loadMetadata()
  }

  const restoreSessionState = () => {
    return storage.loadSessionState()
  }

  const restoreAll = () => {
    return {
      settings: restoreSettings(),
      messages: restoreMessages(),
      metadata: restoreMetadata(),
      sessionState: restoreSessionState(),
    }
  }

  return {
    restoreSettings,
    restoreMessages,
    restoreMetadata,
    restoreSessionState,
    restoreAll,
    storage,
  }
}
