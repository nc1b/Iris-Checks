'use client'
import { motion } from 'framer-motion'
import { BookOpen, ChevronDown, FileText, HeartHandshake, Home, Info, ListChecks, Menu, MessageCircle, Shield, X, type LucideIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { SectionLink } from '@/components/blocks/section-link'
import { ThemeToggle } from '@/components/blocks/theme-toggle'
import { openChat } from '@/lib/chat-events'
import { cn } from '@/lib/utils'

type Item = { name: string; icon: LucideIcon; section: string }

const sectionItems: Item[] = [
    { name: 'Home', section: 'home', icon: Home },
    { name: 'How it works', section: 'how-it-works', icon: ListChecks },
    { name: 'Supporters', section: 'supporters', icon: HeartHandshake },
    { name: 'About', section: 'about', icon: Info },
]

const resources = [
    { name: 'Research', href: '/research', icon: BookOpen, description: 'The studies behind Iris' },
    { name: 'Privacy Policy', href: '/privacy', icon: Shield, description: 'What we collect (very little)' },
    { name: 'Terms of Service', href: '/terms', icon: FileText, description: 'Rules for using the site' },
]

const spySections = ['how-it-works', 'supporters', 'about'] as const

/**
 * Top bar: a logo tile, icon + label pills for the home page sections, a Resources
 * menu, and an "Ask Iris" button that opens the chat. Always visible at the top of
 * the page; it tucks away while you scroll down and returns when you scroll up.
 * The active section is highlighted and a thin line across the top shows progress.
 * On small screens the links move into a menu.
 */
export function SiteNav() {
    const pathname = usePathname()
    const [scrolled, setScrolled] = useState(false)
    const [hidden, setHidden] = useState(false)
    const [progress, setProgress] = useState(0)
    const [section, setSection] = useState<string>('home')
    const [menuOpen, setMenuOpen] = useState(false)
    const [resourcesOpen, setResourcesOpen] = useState(false)
    const resourcesRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        let lastY = window.scrollY
        let frame = 0
        const update = () => {
            frame = 0
            const y = window.scrollY
            const max = document.documentElement.scrollHeight - window.innerHeight
            setScrolled(y > 24)
            setProgress(max > 0 ? Math.min(1, y / max) : 0)
            if (y < 80) setHidden(false)
            else if (Math.abs(y - lastY) > 8) setHidden(y > lastY)
            if (Math.abs(y - lastY) > 8 || y < 80) lastY = y

            // Scroll-spy: the last section whose top has passed 40% of the screen.
            let current = 'home'
            for (const id of spySections) {
                const el = document.getElementById(id)
                if (el && el.getBoundingClientRect().top < window.innerHeight * 0.4) current = id
            }
            if (max > 0 && y >= max - 4 && document.getElementById('about')) current = 'about'
            setSection(current)
        }
        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(update)
        }
        update()
        window.addEventListener('scroll', onScroll, { passive: true })
        window.addEventListener('resize', onScroll)
        return () => {
            cancelAnimationFrame(frame)
            window.removeEventListener('scroll', onScroll)
            window.removeEventListener('resize', onScroll)
        }
    }, [pathname])

    // Close menus on outside clicks and Escape (links close them when clicked).
    useEffect(() => {
        if (!resourcesOpen && !menuOpen) return
        const onDown = (e: PointerEvent) => {
            if (resourcesRef.current && !resourcesRef.current.contains(e.target as Node)) setResourcesOpen(false)
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setResourcesOpen(false)
                setMenuOpen(false)
            }
        }
        document.addEventListener('pointerdown', onDown)
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('pointerdown', onDown)
            document.removeEventListener('keydown', onKey)
        }
    }, [resourcesOpen, menuOpen])

    const active = pathname === '/' ? section : null
    const resourceActive = resources.some((r) => r.href === pathname)
    const askIris = () => {
        setMenuOpen(false)
        openChat()
    }

    return (
        <>
            <div
                aria-hidden
                className="fixed inset-x-0 top-0 z-40 h-0.5 origin-left bg-foreground transition-opacity duration-300"
                style={{ transform: `scaleX(${progress})`, opacity: scrolled ? 1 : 0 }}
            />
            <header
                className={cn(
                    'fixed inset-x-0 top-0 z-30 transition-transform duration-500 ease-out motion-reduce:transition-none',
                    hidden && !menuOpen && '-translate-y-[140%]',
                )}>
                <div className={cn('mx-auto max-w-6xl px-3 transition-[padding] duration-500 sm:px-6', scrolled ? 'pt-2' : 'pt-4')}>
                    <nav
                        aria-label="Main"
                        className={cn(
                            'flex h-14 items-center gap-2 rounded-2xl border bg-background/80 pl-2 pr-2 backdrop-blur-xl transition-shadow duration-500 animate-in fade-in slide-in-from-top-4 [animation-duration:700ms] motion-reduce:animate-none',
                            scrolled ? 'shadow-lg shadow-black/5 dark:shadow-black/40' : 'shadow-sm',
                        )}>
                        {/* Logo tile */}
                        <SectionLink section="home" aria-label="Iris home" className="flex shrink-0 items-center gap-2.5 rounded-xl py-1 pl-1 pr-2 transition-colors hover:bg-accent">
                            <span className="flex h-10 items-center">
                                <Image src="/iris-logo.png" alt="" width={663} height={259} priority className="h-auto w-10 invert dark:invert-0" />
                            </span>
                            <span className="leading-tight">
                                <span className="block text-[15px] font-semibold tracking-tight">Iris</span>
                                <span className="block text-[11px] text-muted-foreground">Pupil check</span>
                            </span>
                        </SectionLink>

                        {/* Center links (desktop) */}
                        <div className="mx-auto hidden items-center gap-1 rounded-xl border bg-muted/50 p-1 lg:flex">
                            {sectionItems.map((item) => (
                                <SectionLink
                                    key={item.section}
                                    section={item.section}
                                    onNavigate={() => setSection(item.section)}
                                    aria-current={active === item.section ? 'location' : undefined}
                                    className={cn(
                                        'relative flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors',
                                        active === item.section ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                                    )}>
                                    {active === item.section && (
                                        <motion.span
                                            layoutId="nav-active"
                                            className="absolute inset-0 rounded-lg border bg-background shadow-sm"
                                            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                                        />
                                    )}
                                    <item.icon className="relative size-4" />
                                    <span className="relative">{item.name}</span>
                                </SectionLink>
                            ))}

                            <div ref={resourcesRef} className="relative">
                                <button
                                    type="button"
                                    aria-expanded={resourcesOpen}
                                    aria-haspopup="menu"
                                    onClick={() => setResourcesOpen((o) => !o)}
                                    className={cn(
                                        'relative flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors',
                                        resourceActive || resourcesOpen ? 'bg-background text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:text-foreground',
                                    )}>
                                    <BookOpen className="size-4" />
                                    Resources
                                    <ChevronDown className={cn('size-3.5 transition-transform duration-200', resourcesOpen && 'rotate-180')} />
                                </button>
                                <div
                                    role="menu"
                                    inert={!resourcesOpen}
                                    className={cn(
                                        'absolute right-0 top-full mt-3 w-72 origin-top-right rounded-2xl border bg-popover p-1.5 text-popover-foreground shadow-xl shadow-black/10 transition-all duration-200 dark:shadow-black/50',
                                        resourcesOpen ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0',
                                    )}>
                                    {resources.map((r) => (
                                        <Link
                                            key={r.href}
                                            href={r.href}
                                            role="menuitem"
                                            onClick={() => setResourcesOpen(false)}
                                            className={cn('flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-accent', pathname === r.href && 'bg-accent')}>
                                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background">
                                                <r.icon className="size-4" />
                                            </span>
                                            <span>
                                                <span className="block text-sm font-medium">{r.name}</span>
                                                <span className="block text-xs text-muted-foreground">{r.description}</span>
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right side */}
                        <div className="ml-auto flex items-center gap-1.5 lg:ml-0">
                            <ThemeToggle className="size-10 rounded-xl" />
                            <button
                                type="button"
                                onClick={askIris}
                                className="hidden h-10 items-center gap-2 rounded-xl bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-85 sm:flex">
                                <MessageCircle className="size-4" />
                                Ask Iris
                            </button>
                            <button
                                type="button"
                                onClick={() => setMenuOpen((o) => !o)}
                                aria-expanded={menuOpen}
                                aria-controls="mobile-menu"
                                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                                className="relative flex size-10 items-center justify-center rounded-xl border transition-colors hover:bg-accent lg:hidden">
                                <Menu className={cn('absolute size-5 transition-all duration-200', menuOpen ? 'rotate-90 scale-0 opacity-0' : 'scale-100 opacity-100')} />
                                <X className={cn('absolute size-5 transition-all duration-200', menuOpen ? 'scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0')} />
                            </button>
                        </div>
                    </nav>

                    {/* Mobile menu */}
                    <div
                        id="mobile-menu"
                        inert={!menuOpen}
                        className={cn(
                            'mt-2 origin-top overflow-hidden rounded-2xl border bg-background/95 p-2 shadow-xl shadow-black/10 backdrop-blur-xl transition-all duration-300 lg:hidden dark:shadow-black/50',
                            menuOpen ? 'max-h-[80vh] scale-100 opacity-100' : 'pointer-events-none max-h-0 scale-95 border-transparent p-0 opacity-0',
                        )}>
                        <div className="grid grid-cols-2 gap-1">
                            {sectionItems.map((item) => (
                                <SectionLink
                                    key={item.section}
                                    section={item.section}
                                    onNavigate={() => {
                                        setSection(item.section)
                                        setMenuOpen(false)
                                    }}
                                    className={cn(
                                        'flex items-center gap-2.5 rounded-xl px-3 py-3 text-sm font-medium transition-colors hover:bg-accent',
                                        active === item.section && 'bg-accent',
                                    )}>
                                    <item.icon className="size-4" />
                                    {item.name}
                                </SectionLink>
                            ))}
                        </div>
                        <p className="px-3 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Resources</p>
                        {resources.map((r) => (
                            <Link
                                key={r.href}
                                href={r.href}
                                onClick={() => setMenuOpen(false)}
                                className={cn('flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-accent', pathname === r.href && 'bg-accent')}>
                                <r.icon className="size-4" />
                                {r.name}
                            </Link>
                        ))}
                        <button
                            type="button"
                            onClick={askIris}
                            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-sm font-medium text-background sm:hidden">
                            <MessageCircle className="size-4" />
                            Ask Iris
                        </button>
                    </div>
                </div>
            </header>
        </>
    )
}

/** The Iris mark (a transparent white PNG): black in light mode, white in dark mode. */
export const Logo = ({ className }: { className?: string }) => {
    return <Image src="/iris-logo.png" alt="" width={663} height={259} className={cn('h-8 w-auto object-contain invert dark:invert-0', className)} />
}
