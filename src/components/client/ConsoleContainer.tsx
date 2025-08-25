import { useDataStream } from "@/hooks/useDataStream"
import clsx from "clsx"

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
  const { isConnected, messages } = useDataStream(sessionId)

  return (
    <div
      className={clsx(
        "w-full max-h-screen flex flex-col flex-1 basis-1/2 pt-2 overflow-x-hidden bg-slate-950 overflow-y-auto",
        {
          "border-1 border-green-400": !isConnected,
        }
      )}
    >
      {messages.map((msg, index) => {
        return (
          <div
            className="flex flex-row self-stretch p-0.5 px-4 bottom-b-1 bottom-b-white/10 items-center gap-x-4 text-white/90 font-mono text-sm"
            key={String(`message-${index}`)}
          >
            <p className="text-white/40 text-sm">
              {msg.createdAt.toLocaleString("en-US", {
                timeStyle: "medium",
              })}
            </p>
            <p>{msg.message}</p>
          </div>
        )
      })}
    </div>
  )
}
