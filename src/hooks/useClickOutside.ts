import { useEffect, useRef, type RefObject } from 'react'

export function useClickOutside<T extends HTMLElement>(
    handler: () => void,
    enabled: boolean = true
): RefObject<T | null> {
    const ref = useRef<T | null>(null)

    useEffect(() => {
        if (!enabled) return

        const listener = (event: MouseEvent | TouchEvent) => {
            if (!ref.current || ref.current.contains(event.target as Node)) return
            handler()
        }

        document.addEventListener('mousedown', listener)
        document.addEventListener('touchstart', listener)

        return () => {
            document.removeEventListener('mousedown', listener)
            document.removeEventListener('touchstart', listener)
        }
    }, [handler, enabled])

    return ref
}
