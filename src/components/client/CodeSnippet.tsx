import { cn } from '@/lib/utils'

type Props = {
  endpoint: string
  className?: string
  sessionId: string
}

export function CodeSnippet({ sessionId, className, endpoint }: Props) {
  return (
    <div
      className={cn(
        'font-mono text-sm p-2 border-white/10 bg-slate-950 border-1 rounded-sm font-semibold',
        className
      )}
    >
      <span className="text-blue-500">{'fetch('}</span>
      <span className="text-green-500">{`"${endpoint}${sessionId}"`}</span>
      <span className="text-gray-500">{', {'}</span>
      <br />
      <span className="text-white/95 ml-4">{'method: '}</span>
      <span className="text-orange-500">{'"POST"'}</span>
      <span className="text-gray-500">{','}</span>
      <br />
      <span className="text-white/95 ml-4">{'body: '}</span>
      <span className="text-green-500">{'"Hello, world!"'}</span>
      <br />
      <span className="text-gray-500">{'}'}</span>
      <span className="text-blue-500">{')'}</span>
    </div>
  )
}
