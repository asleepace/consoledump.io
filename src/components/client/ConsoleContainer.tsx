import { useState } from 'react'
import { useConsoleDump } from './useConsoleDump'

export type ConsoleMessage = {
  createdAt: Date
  message: string
}

export type ConsoleContainerProps = {
  sessionId: string
  initialMessages: ConsoleMessage[]
}

export function ConsoleContainer({
  sessionId,
  initialMessages = [],
}: ConsoleContainerProps) {
  const { messages } = useConsoleDump(sessionId)

  return (
    <div className="w-full flex flex-col flex-1 border-1 basis-1/2 border-white/10 pt-2 overflow-x-hidden bg-slate-950 overflow-y-auto">
      {messages.map((msg, index) => {
        return (
          <div
            className="flex flex-row self-stretch p-0.5 px-4 bottom-b-1 bottom-b-white/10 items-center gap-x-4 text-white/90 font-mono text-sm"
            key={String(`message-${index}`)}
          >
            <p className="text-white/40 text-sm">
              {msg.createdAt.toLocaleString('en-US', {
                timeStyle: 'medium',
              })}
            </p>
            <p>{msg.message}</p>
          </div>
        )
      })}
    </div>
  )
}
