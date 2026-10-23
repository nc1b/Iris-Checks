/**
 * Wrapper the sections use around their content.
 *
 * It used to fade and slide content in the first time it scrolled into view. That left
 * sections blank until the browser noticed them (jumping with the top bar, fast
 * scrolling, screenshots, background tabs), so content now shows immediately.
 * `effect` and `delay` are still accepted so existing call sites don't need changing.
 */
type Effect = 'up' | 'left' | 'right' | 'zoom' | 'fade'

export function Reveal({
    children,
    className,
    as: Tag = 'div',
}: {
    children: React.ReactNode
    className?: string
    effect?: Effect
    delay?: number
    as?: 'div' | 'li' | 'section' | 'figure'
}) {
    return <Tag className={className}>{children}</Tag>
}
