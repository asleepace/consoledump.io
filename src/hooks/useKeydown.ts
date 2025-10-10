import { useEffect, useRef } from 'react'

type Props = {
  handler: (key: KeyboardEvent) => any
  deps: React.DependencyList
}

export function useKeydown(handler: (key: KeyboardEvent) => any, deps: React.DependencyList) {
  const isDisabledRef = useRef(false)

  useEffect(() => {
    const onKeyUp = () => {
      isDisabledRef.current = false
    }

    const onKeyPress = (key: KeyboardEvent) => {
      handler(key)
    }

    window.addEventListener('keydown', onKeyPress)
    window.addEventListener('keyup', onKeyUp)

    return () => {
      window.removeEventListener('keydown', onKeyPress)
      window.removeEventListener('keyup', onKeyUp)
      isDisabledRef.current = false
    }
  }, deps)
}
