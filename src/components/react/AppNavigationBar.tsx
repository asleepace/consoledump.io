import { ChevronsDown, Download, Info, Settings, Terminal, Trash, Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PropsWithChildren } from 'react'
import { ActionBar, type ActionBarEvent } from './ActionBar'

export function SiteTitle(props: { className?: string }) {
  return (
    <a href="/" className={cn('font-mono', props.className)}>
      <span className="text-white">console</span>
      <span className="text-orange-400">dump</span>
    </a>
  )
}

export function IconButton({
  label,
  className,
  onClick,
  children,
}: PropsWithChildren<{
  label?: string
  className: string
  onClick: () => any
}>) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-1.5 rounded-2xl text-xs',
        'bg-gray-500/20 hover:bg-gray-500/50 text-gray-500',
        className
      )}
    >
      {children}
    </button>
  )
}

export function OnlineIndicator({ isConnected }: { isConnected: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-xs ${
        isConnected ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'
      }`}
    >
      {isConnected ? (
        <>
          <Wifi className="w-3 h-3" />
          <span>Live</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3" />
          <span>Offline</span>
        </>
      )}
    </div>
  )
}

export type AppNavigationBarProps = {
  onSubmitAction: (ev: ActionBarEvent) => void
  scrollToBottom: () => void
  downloadLogs: () => void
  clearLogs: () => void
  isConnected: boolean
  className?: string
}

/**
 * Navigation bar used in ConsoleDumpClient.tsx
 */
export function AppNavigationBar(props: AppNavigationBarProps) {
  return (
    <nav className={cn('sticky flex top-0 w-full bg-black p-4 items-center gap-x-4', props.className)}>
      <div className="flex flex-1 w-full">
        <div className="flex items-center gap-2">
          <Terminal className="text-blue-400" size={16} />
          <SiteTitle />
          <OnlineIndicator isConnected={props.isConnected} />
        </div>
        <div className="px-4 flex flex-1">
          <ActionBar onSubmit={props.onSubmitAction} />
        </div>
        <div className="shrink justify-end items-center flex gap-x-1.5">
          {/* Information button */}
          <IconButton
            label="Scroll to bottom"
            className="text-blue-500 bg-blue-500/20 hover:bg-blue-500/50"
            onClick={props.scrollToBottom}
          >
            <Info size={16} />
          </IconButton>
          {/* Scroll to bottom */}
          <IconButton
            label="Scroll to bottom"
            className="text-blue-500 bg-blue-500/20 hover:bg-blue-500/50"
            onClick={props.scrollToBottom}
          >
            <ChevronsDown size={16} />
          </IconButton>
          <div className="h-6 w-[0.2px] bg-white/20 mx-1" />
          {/* Download button */}
          <IconButton
            label="Download"
            className="text-green-500/90 bg-green-500/20 hover:bg-green-500/50"
            onClick={props.downloadLogs}
          >
            <Download size={16} />
          </IconButton>
          {/* Trash button */}
          <IconButton
            label="Clear logs"
            className="text-red-500/90 bg-red-500/20 hover:bg-red-500/50"
            onClick={props.clearLogs}
          >
            <Trash size={16} />
          </IconButton>
          <div className="h-6 w-[0.2px] bg-white/20 mx-1" />
          {/* Settings button */}
          <IconButton
            label="Settings"
            className="text-gray-500/90 bg-gray-500/20 hover:bg-gray-500/50"
            onClick={() => {}}
          >
            <Settings size={16} />
          </IconButton>
        </div>
      </div>
    </nav>
  )
}
