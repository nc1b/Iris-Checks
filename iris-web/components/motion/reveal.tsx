'use client'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type Effect = 'up' | 'left' | 'right' | 'zoom' | 'fade'

const hiddenStyles: Record<Effect, string> = {
    up: 'translate-y-10 opacity-0',
    left: '-translate-x-10 opacity-0',
    right: 'translate-x-10 opacity-0',
    zoom: 'scale-95 opacity-0',
    fade: 'opacity-0',
}

/**
 * Fades and slides its children into view the first time they scroll onto the screen.
 * Respects "reduce motion" settings.
 */
export function Reveal({
    children,
    className,
    effect = 'up',
    delay = 0,
    as: Tag = 'div',
}: {
    children: React.ReactNode
    className?: string
    effect?: Effect
    delay?: number
    as?: 'div' | 'li' | 'section' | 'figure'
}) {
    const ref = useRef<HTMLElement>(null)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const el = ref.current
        if (!el) return
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true)
                    observer.disconnect()
                }
            },
            { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
        )
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    return (
        <Tag
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ref={ref as any}
            style={{ transitionDelay: `${delay}ms` }}
            className={cn(
                'transition-all duration-700 ease-out motion-reduce:translate-none motion-reduce:scale-100 motion-reduce:opacity-100 motion-reduce:transition-none',
                visible ? 'translate-x-0 translate-y-0 scale-100 opacity-100' : hiddenStyles[effect],
                className,
            )}>
            {children}
        </Tag>
    )
}
