import { cn } from '@/lib/utils'
import React, { useState } from 'react'

interface RightPanelProps {
  className?: string
  onClose: () => void
  isOpen: boolean
}

export function RightPanel(props: React.PropsWithChildren<RightPanelProps>) {
  return (
    <aside
      className={cn(
        'h-full text-zinc-200 bg-black border-l border-zinc-950 overflow-x-hidden',
        'transition-all duration-300 ease-in-out',
        props.className
      )}
    >
      <div className="overflow-y-auto h-full">
        <div className="min-h-max">
          {/* Panel content */}
          {props.children}
        </div>
      </div>
    </aside>
  )
}
