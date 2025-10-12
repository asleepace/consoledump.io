import { cn } from '@/lib/utils'
import { ChevronLeft } from 'lucide-react'

export interface Props {
  className?: string
  isOpen: boolean
  handleOpen: () => void
  handleClose: () => void
}

export function Panel({
  isOpen,
  children,
  className,
  handleOpen,
  handleClose,
}: React.PropsWithChildren<Props>) {
  return (
    <>
      {/* Toggle button when closed */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed right-0 top-1/2 -translate-y-1/2 bg-zinc-800 text-gray-300 p-2 rounded-l-md hover:bg-zinc-700 transition-colors z-40"
        >
          <ChevronLeft size={20} />
        </button>
      )}

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/0 z-40 transition-opacity"
          onClick={handleClose}
        />
      )}

      {/* --- Side panel --- */}
      <div
        className={cn(
          `fixed right-0 font-mono top-0 h-full max-h-screen w-full md:w-128 bg-zinc-900 text-gray-200 z-50 transform transition-transform duration-300 ease-in-out`,
          isOpen ? 'translate-x-0' : 'translate-x-full',
          className
        )}
      >
        <div className="overflow-y-auto h-full">
          <div className="p-4 *:text-sm *:font-sans *:text-zinc-500 flex flex-1 min-h-max flex-col gap-y-4">
            {children}
          </div>
        </div>
      </div>
    </>
  )
}
