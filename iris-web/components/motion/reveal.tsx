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
