'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

const PENDING_KEY = 'iris:scroll-target'

export function scrollToSection(section: string) {
    if (section === 'home') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
    }
    document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function useSectionNavigation() {
    const pathname = usePathname()
    const router = useRouter()
    return (section: string) => {
        if (pathname === '/') {
            scrollToSection(section)
            return
        }
        try {
            sessionStorage.setItem(PENDING_KEY, section)
        } catch {
        }
        router.push('/')
    }
}

export function SectionLink({
    section,
    className,
    children,
    onNavigate,
    ref,
    ...rest
}: {
    section: string
    className?: string
    children: React.ReactNode
    onNavigate?: () => void
    ref?: React.Ref<HTMLAnchorElement>
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick'>) {
    const go = useSectionNavigation()
    return (
        <Link
            ref={ref}
            href="/"
            scroll={false}
            className={className}
            onClick={(e) => {
                e.preventDefault()
                onNavigate?.()
                go(section)
            }}
            {...rest}>
            {children}
        </Link>
    )
}

export function InPageLink({ target, className, children }: { target: string; className?: string; children: React.ReactNode }) {
    return (
        <a
            href={`#${target}`}
            className={className}
            onClick={(e) => {
                e.preventDefault()
                document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}>
            {children}
        </a>
    )
}

export function PendingSectionScroll() {
    useEffect(() => {
        let target: string | null = null
        try {
            target = sessionStorage.getItem(PENDING_KEY)
            sessionStorage.removeItem(PENDING_KEY)
        } catch {
        }
        if (!target && window.location.hash) target = decodeURIComponent(window.location.hash.slice(1))
        if (window.location.hash) history.replaceState(null, '', window.location.pathname + window.location.search)
        if (target) {
            const id = window.setTimeout(() => scrollToSection(target!), 80)
            return () => window.clearTimeout(id)
        }
    }, [])
    return null
}
