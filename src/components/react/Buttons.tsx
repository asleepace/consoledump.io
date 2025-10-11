import { cn } from '@/lib/utils'
import { Check, Copy } from 'lucide-react'

/**
 * Basic copy to clipboard button.
 */
export const BtnCopyToClipboard = (props: {
  onClick: () => void
  isCopied: boolean
  className?: string
}) => (
  <button
    onClick={props.onClick}
    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-1 hover:bg-blue-500/20 rounded"
  >
    {props.isCopied ? (
      <Check className="w-3.5 h-3.5 text-emerald-500" />
    ) : (
      <Copy
        className={cn('w-3.5 h-3.5 group-hover:text-blue-500', props.className)}
      />
    )}
  </button>
)
