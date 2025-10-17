import { cn } from '@/lib/utils'
import { ChevronLeft, X } from 'lucide-react'
import type { JSX } from 'react'

export type PanelSectionProps = {
  className?: string
  icon?: JSX.Element
  headerTitle?: string | JSX.Element
  headerRight?: JSX.Element
  hideHeader?: boolean
}

export const CloseButton = (props: { handleClose: () => void }) => {
  return (
    <button
      onClick={props.handleClose}
      className="text-neutral-400 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 p-2 rounded-lg hover:text-white transition-all"
    >
      <X size={18} />
    </button>
  )
}

export const PanelSection = (
  props: React.PropsWithChildren<PanelSectionProps>
) => {
  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-2.5 mb-4',
          props.className,
          props.hideHeader && 'hidden'
        )}
      >
        {props.icon}
        <div className="text-lg text-white font-semibold tracking-tight flex-1">
          {props.headerTitle}
        </div>
        {props.headerRight}
      </div>
      <div className="flex flex-col shrink">{props.children}</div>
    </div>
  )
}

export interface Props {
  className?: string
  isOpen: boolean
  showTab?: boolean
  handleOpen: () => void
  handleClose: () => void
  header?: JSX.Element
}

export function Panel({
  header,
  isOpen,
  showTab,
  children,
  className,
  handleOpen,
  handleClose,
}: React.PropsWithChildren<Props>) {
  return (
    <>
      {/* Toggle button when closed */}
      {!isOpen && showTab && (
        <button
          onClick={handleOpen}
          className="fixed right-0 top-1/2 -translate-y-1/2 bg-neutral-900/90 backdrop-blur-sm border border-l-0 border-white/10 text-neutral-300 p-3 rounded-l-lg hover:bg-neutral-800 hover:text-white transition-all z-40 shadow-lg"
        >
          <ChevronLeft size={20} />
        </button>
      )}

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
          onClick={handleClose}
        />
      )}

      {/* --- Side panel --- */}
      <div
        className={cn(
          `fixed right-0 font-sans top-0 h-full max-h-screen w-full md:w-128 bg-neutral-950/95 backdrop-blur-xl border-l border-white/10 text-neutral-200 z-60 transform transition-transform duration-300 ease-in-out`,
          isOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full',
          className
        )}
      >
        <div className="overflow-y-auto h-full">
          {/* --- header --- */}
          <div className="sticky left-0 right-0 w-full top-0 bg-neutral-950/95 backdrop-blur-md z-10 px-6 py-4 border-b border-white/10 mb-4">
            <div className="flex items-start justify-between gap-3">
              {header}
              <CloseButton handleClose={handleClose} />
            </div>
          </div>
          <div className="p-5 *:text-sm *:font-sans *:text-neutral-400 flex flex-1 min-h-max flex-col gap-y-5">
            {children}
          </div>
        </div>
      </div>
    </>
  )
}
