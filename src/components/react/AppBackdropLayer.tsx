import { cn } from '@/lib/utils'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  hidden?: boolean
  className?: string
  onClick?: () => any
}

/**
 *  ## AppBackdropLayer
 *
 *  Backdrop layer which will appear fixed over the entire screen (z-10),
 *  use the `hidden={true}` property to toggle. Also takes an optional `onClick={() => void}`
 *  handler which is called when the view is clicked or the `"Escape"` key is pressed.
 *
 *  @param {Object} props
 *  @param {boolean} props.hidden toggle visibility of element.
 *  @param {boolean} props.className defaults to `'backdrop-blur-xs'`.
 *  @param {Function} props.onClick (optional) called when clicked or escape key is pressed.
 */
export function AppBackdropLayer({
  hidden,
  onClick,
  className = 'backdrop-blur-[1px]',
}: Props) {
  const didForceClose = useRef(false)

  useEffect(() => {
    if (!onClick || hidden) return

    const onEscapeKey = (key: KeyboardEvent) => {
      if (key.code !== 'Escape') return
      if (didForceClose.current) return
      didForceClose.current = true
      onClick?.()
    }

    window.addEventListener('keydown', onEscapeKey)

    return () => {
      window.removeEventListener('keydown', onEscapeKey)
      didForceClose.current = false // Reset the ref on cleanup
    }
  }, [hidden, onClick])

  if (hidden) return null

  return createPortal(
    <div
      id="backdrop-layer"
      onClick={onClick}
      className={cn(
        'fixed inset-0 z-10 bg-black/30 transition-colors duration-200',
        className
      )}
    />,
    document.body
  )
}
