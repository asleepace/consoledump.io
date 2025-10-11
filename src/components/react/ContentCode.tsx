import { cn } from '@/lib/utils'
import { ChevronDown, ChevronRight } from 'lucide-react'

/** Text Content Preview */
const getContentPreview = ({
  content,
  maxSize = 80,
}: {
  maxSize?: number
  content: string
}) => {
  const isUnderMaxSize = content.length > maxSize
  const preview = content.slice(0, maxSize)
  return isUnderMaxSize ? preview : `${preview}...`
}

/** Displayed Code Content */
export const ContentCode = ({
  content,
  textColor,
  isExpanded,
  onClick,
  className,
}: {
  textColor?: string
  content: string
  isExpanded: boolean
  className?: string
  onClick: () => void
}) => {
  const contentPreview = getContentPreview({ content, maxSize: 80 })

  return (
    <div className="space-y-1">
      <button
        onClick={onClick}
        className="flex text-pink-500 items-center gap-1.5 w-full text-left"
      >
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
        <span className={cn('text-xs', textColor, !isExpanded && 'truncate')}>
          {contentPreview}
        </span>
      </button>
      {isExpanded && (
        <div className="flex shrink">
          <pre
            className={cn(
              'p-2 rounded text-xs overflow-x-auto flex text-green-500',
              className
            )}
          >
            <code>{content}</code>
          </pre>
        </div>
      )}
    </div>
  )
}
