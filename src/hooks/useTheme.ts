import { useMemo, useState } from 'react'

export type ThemeMode = 'light' | 'dark'

export type ThemeVars = {
  mode: ThemeMode
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

const defaultThemes: Record<ThemeMode, ThemeVars> = {
  dark: {
    mode: 'dark',
    bg: 'bg-gray-950',
    card: 'bg-gray-900',
    border: 'border-gray-800',
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

const badgeColors = {
  connected: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  system: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  message: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  closed: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  error: 'bg-red-500/20 text-red-400 border-red-500/30',
  default: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

const typeColors = {
  connected: 'text-emerald-400',
  system: 'text-blue-400',
  message: 'text-gray-300',
  error: 'text-red-400',
  closed: 'text-orange-400',
  default: 'text-gray-300',
}

export type BadgeColors = typeof badgeColors
export type BadgeTypes = keyof BadgeColors

export const getTypeBadge = (type: BadgeTypes) => {
  return badgeColors[type] ?? badgeColors.default
}

export const getTypeColor = (type: BadgeTypes) => {
  return typeColors[type] ?? typeColors.default
}

export function useTheme() {
  const [theme, setTheme] = useState(defaultThemes.dark)

  return useMemo(() => {
    const isDark = theme.mode === 'dark'

    const toggleDarkMode = () => {
      setTheme((prev) => ({ ...prev, mode: isDark ? 'light' : 'dark' }))
    }

    return {
      ...theme,
      isDark,
      toggleDarkMode,
    }
  }, [theme])
}
