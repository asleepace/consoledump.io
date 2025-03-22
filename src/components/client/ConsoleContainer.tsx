import { useState } from 'react'

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
  const [messages, setMessages] = useState<ConsoleMessage[]>(initialMessages)

  return (
    <div className="w-full flex flex-col flex-1 border-1 basis-1/2 border-white/10 overflow-x-hidden bg-slate-950 overflow-y-auto">
      {messages.map((msg) => {
        return (
          <div
            className="flex flex-row self-stretch p-2 px-4 bottom-b-1 bottom-b-white/10 items-center gap-x-2 text-white/90 font-mono text-sm"
            key={msg.message}
          >
            <p className="text-white/40">
              {msg.createdAt.toLocaleString('en-US', {
                timeStyle: 'medium',
              }) + ': '}
            </p>
            <p>{msg.message}</p>
          </div>
        )
      })}
    </div>
  )
}
