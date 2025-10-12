import { useEffect, useReducer, useState } from 'react'

type Settings = {
  showTimestamp: boolean
  showBadges: boolean
  showDividers: boolean
  autoScroll: boolean
  saveLocally: boolean
  enableHtml: boolean
  renderKey: number
}

type SettingsAction =
  | { type: 'TOGGLE_TIMESTAMP' }
  | { type: 'TOGGLE_BADGES' }
  | { type: 'TOGGLE_DIVIDERS' }
  | { type: 'TOGGLE_AUTO_SCROLL' }
  | { type: 'TOGGLE_SAVE_LOCALLY' }
  | { type: 'TOGGLE_ENABLE_HTML' }
  | { type: 'SET_SETTING'; key: keyof Settings; value: boolean }
  | { type: 'RESET_SETTINGS' }
  | { type: 'LOAD_SETTINGS'; settings: Partial<Settings> }

const initialSettings: Settings = {
  showTimestamp: true,
  showBadges: true,
  showDividers: true,
  autoScroll: true,
  saveLocally: false,
  enableHtml: true,
  renderKey: 1,
}

const STORAGE_KEY = 'console-dump-settings'

function loadSettings(): Settings {
  if (typeof window === 'undefined') return initialSettings

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    console.log(stored)
    if (stored) {
      const parsed = JSON.parse(stored)
      return { ...initialSettings, ...parsed }
    }
  } catch (e) {
    console.error('Failed to load settings:', e)
  }

  return initialSettings
}

function saveSettings(settings: Settings) {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (e) {
    console.error('Failed to save settings:', e)
  }
}

function settingsReducer(state: Settings, action: SettingsAction): Settings {
  let newState: Settings

  switch (action.type) {
    case 'TOGGLE_TIMESTAMP':
      newState = { ...state, showTimestamp: !state.showTimestamp }
      break

    case 'TOGGLE_BADGES':
      newState = { ...state, showBadges: !state.showBadges }
      break

    case 'TOGGLE_DIVIDERS':
      newState = { ...state, showDividers: !state.showDividers }
      break

    case 'TOGGLE_AUTO_SCROLL':
      newState = { ...state, autoScroll: !state.autoScroll }
      break

    case 'TOGGLE_SAVE_LOCALLY':
      newState = { ...state, saveLocally: !state.saveLocally }
      break

    case 'TOGGLE_ENABLE_HTML':
      newState = { ...state, enableHtml: !state.enableHtml }
      break

    case 'SET_SETTING':
      newState = { ...state, [action.key]: action.value }
      break

    case 'RESET_SETTINGS':
      newState = initialSettings
      break

    case 'LOAD_SETTINGS':
      newState = { ...state, ...action.settings }
      break

    default:
      return state
  }

  // Auto-save if enabled
  saveSettings(newState)

  return { ...newState, renderKey: newState.renderKey + 1 }
}

export type AppSettings = ReturnType<typeof useSettings>

export function useSettings() {
  const [isHydrated, setIsHydrated] = useState(false)
  const [settings, dispatch] = useReducer(settingsReducer, initialSettings)

  useEffect(() => {
    const stored = loadSettings()
    if (stored !== initialSettings) {
      dispatch({ type: 'LOAD_SETTINGS', settings: stored })
    }
    setIsHydrated(true)
  }, [])

  return {
    isHydrated,
    settings,
    dispatch,
    // Helper functions
    toggleTimestamp: () => dispatch({ type: 'TOGGLE_TIMESTAMP' }),
    toggleBadges: () => dispatch({ type: 'TOGGLE_BADGES' }),
    toggleDividers: () => dispatch({ type: 'TOGGLE_DIVIDERS' }),
    toggleAutoScroll: () => dispatch({ type: 'TOGGLE_AUTO_SCROLL' }),
    toggleSaveLocally: () => dispatch({ type: 'TOGGLE_SAVE_LOCALLY' }),
    toggleEnableHtml: () => dispatch({ type: 'TOGGLE_ENABLE_HTML' }),
    setSetting: (key: keyof Settings, value: boolean) =>
      dispatch({ type: 'SET_SETTING', key, value }),
    resetSettings: () => dispatch({ type: 'RESET_SETTINGS' }),
    loadSettings: (settings: Partial<Settings>) =>
      dispatch({ type: 'LOAD_SETTINGS', settings }),
  }
}
