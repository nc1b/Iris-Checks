'use client'
import { motion } from 'framer-motion'
import {
    BookOpen,
    ChevronDown,
    CircleHelp,
    FileText,
    HeartHandshake,
    Home,
    Info,
    LayoutGrid,
    ListChecks,
    Map as MapIcon,
    Menu,
    MessageCircle,
    ScanEye,
    Shield,
    Users,
    X,
    type LucideIcon,
} from 'lucide-react'
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
    { name: 'Checks', section: 'checks', icon: ScanEye },
    { name: 'How it works', section: 'how-it-works', icon: ListChecks },
    { name: 'Roadmap', section: 'roadmap', icon: MapIcon },
    { name: 'FAQ', section: 'faq', icon: CircleHelp },
]

type MoreItem = { name: string; icon: LucideIcon; description: string; badge?: string } & ({ href: string } | { section: string })

const moreItems: MoreItem[] = [
    { name: 'Research', href: '/research', icon: BookOpen, description: 'The studies behind each check' },
    { name: 'Team', href: '/team', icon: Users, description: 'The students building Iris', badge: 'Soon' },
    { name: 'Supporters', section: 'supporters', icon: HeartHandshake, description: 'Help bring eye checks to every phone' },
    { name: 'About', section: 'about', icon: Info, description: 'Why we started Iris' },
    { name: 'Privacy Policy', href: '/privacy', icon: Shield, description: 'What we collect (very little)' },
    { name: 'Terms of Service', href: '/terms', icon: FileText, description: 'Rules for using the site' },
]

// Home page sections, top to bottom, and which top-bar entry each one lights up.
const spySections: [id: string, nav: string][] = [
    ['checks', 'checks'],
    ['how-it-works', 'how-it-works'],
    ['coming-soon', 'how-it-works'],
    ['roadmap', 'roadmap'],
    ['supporters', 'more'],
    ['about', 'more'],
    ['faq', 'faq'],
]

/**
 * Top bar: logo, icon + label links to the home page sections, a "More" menu, the
 * theme toggle and an "Ask Iris" button. Always visible near the top of the page;
 * it tucks away while you scroll down and returns when you scroll up (but never while
 * a menu is open or while it's scrolling you to a section). On small screens the
 * links move into a menu.
 */
export function SiteNav() {
    const pathname = usePathname()
    const [scrolled, setScrolled] = useState(false)
    const [hidden, setHidden] = useState(false)
    const [progress, setProgress] = useState(0)
    const [section, setSection] = useState<string>('home')
    const [menuOpen, setMenuOpen] = useState(false)
    const [moreOpen, setMoreOpen] = useState(false)
    const moreRef = useRef<HTMLDivElement>(null)
    const headerRef = useRef<HTMLElement>(null)
    // While the page smooth-scrolls to a section we clicked, keep the bar in place.
    const holdUntil = useRef(0)

    useEffect(() => {
        let lastY = window.scrollY
        let frame = 0
        const update = () => {
            frame = 0
            const y = window.scrollY
            const max = document.documentElement.scrollHeight - window.innerHeight
            setScrolled(y > 24)
            setProgress(max > 0 ? Math.min(1, y / max) : 0)
            if (y < 80 || performance.now() < holdUntil.current) setHidden(false)
            else if (Math.abs(y - lastY) > 8) setHidden(y > lastY)
            if (Math.abs(y - lastY) > 8 || y < 80) lastY = y

            // Scroll-spy: the last section whose top has passed 40% of the screen.
            let current = 'home'
            for (const [id, nav] of spySections) {
                const el = document.getElementById(id)
                if (el && el.getBoundingClientRect().top < window.innerHeight * 0.4) current = nav
            }
            if (max > 0 && y >= max - 4 && document.getElementById('faq')) current = 'faq'
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
        if (!moreOpen && !menuOpen) return
        const onDown = (e: PointerEvent) => {
            const target = e.target as Node
            if (moreRef.current && !moreRef.current.contains(target)) setMoreOpen(false)
            if (headerRef.current && !headerRef.current.contains(target)) setMenuOpen(false)
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setMoreOpen(false)
                setMenuOpen(false)
            }
        }
        document.addEventListener('pointerdown', onDown)
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('pointerdown', onDown)
            document.removeEventListener('keydown', onKey)
        }
    }, [moreOpen, menuOpen])

    const goTo = (id: string) => {
        holdUntil.current = performance.now() + 1600
        setHidden(false)
        setMenuOpen(false)
        setMoreOpen(false)
        const spy = spySections.find(([s]) => s === id)
        setSection(id === 'home' ? 'home' : (spy?.[1] ?? id))
    }

    const onHome = pathname === '/'
    const active = onHome ? section : null
    const moreActive = moreItems.some((m) => 'href' in m && m.href === pathname) || active === 'more'
    const askIris = () => {
        setMenuOpen(false)
        openChat()
    }

    return (
        <>
            <div
                aria-hidden
                className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-foreground transition-opacity duration-300"
                style={{ transform: `scaleX(${progress})`, opacity: scrolled ? 1 : 0 }}
            />
            <header
                ref={headerRef}
                className={cn(
                    'fixed inset-x-0 top-0 transition-transform duration-500 ease-out motion-reduce:transition-none',
                    // Above the chat (z-40) while the phone menu is open.
                    menuOpen ? 'z-50' : 'z-30',
                    hidden && !menuOpen && !moreOpen && '-translate-y-[140%]',
                )}>
                <div className={cn('mx-auto max-w-6xl px-3 transition-[padding] duration-500 sm:px-6', scrolled ? 'pt-2' : 'pt-4')}>
                    <nav
                        aria-label="Main"
                        className={cn(
                            'flex h-14 items-center gap-2 rounded-2xl border bg-background/80 pl-2 pr-2 backdrop-blur-xl transition-shadow duration-500 animate-in fade-in slide-in-from-top-4 [animation-duration:700ms] motion-reduce:animate-none',
                            scrolled ? 'shadow-lg shadow-black/5 dark:shadow-black/40' : 'shadow-sm',
                        )}>
                        {/* Logo */}
                        <SectionLink
                            section="home"
                            onNavigate={() => goTo('home')}
                            aria-label="Iris home"
                            className="flex shrink-0 items-center gap-2.5 rounded-xl py-1 pl-1 pr-2 transition-colors hover:bg-accent">
                            <span className="flex h-10 items-center">
                                <Image src="/iris-logo.png" alt="" width={663} height={259} priority className="h-auto w-10 invert dark:invert-0" />
                            </span>
                            <span className="leading-tight">
                                <span className="block text-[15px] font-semibold tracking-tight">Iris</span>
                                <span className="block text-[11px] text-muted-foreground">Eye checks</span>
                            </span>
                        </SectionLink>

                        {/* Center links (desktop) */}
                        <div className="mx-auto hidden items-center gap-1 rounded-xl border bg-muted/50 p-1 lg:flex">
                            {sectionItems.map((item) => {
                                const isActive = active === item.section
                                return (
                                    <SectionLink
                                        key={item.section}
                                        section={item.section}
                                        onNavigate={() => goTo(item.section)}
                                        aria-current={isActive ? 'location' : undefined}
                                        className={cn(
                                            'relative flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors',
                                            isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                                        )}>
                                        {isActive && (
                                            <motion.span
                                                layoutId="nav-active"
                                                className="absolute inset-0 rounded-lg border bg-background shadow-sm"
                                                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                                            />
                                        )}
                                        <item.icon className="relative hidden size-4 xl:block" />
                                        <span className="relative whitespace-nowrap">{item.name}</span>
                                    </SectionLink>
                                )
                            })}

                            <div ref={moreRef} className="relative">
                                <button
                                    type="button"
                                    aria-expanded={moreOpen}
                                    aria-haspopup="menu"
                                    onClick={() => setMoreOpen((o) => !o)}
                                    className={cn(
                                        'relative flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors',
                                        moreActive || moreOpen ? 'bg-background text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:text-foreground',
                                    )}>
                                    <LayoutGrid className="hidden size-4 xl:block" />
                                    More
                                    <ChevronDown className={cn('size-3.5 transition-transform duration-200', moreOpen && 'rotate-180')} />
                                </button>
                                <div
                                    role="menu"
                                    inert={!moreOpen}
                                    className={cn(
                                        'absolute right-0 top-full mt-3 grid w-[34rem] origin-top-right grid-cols-2 gap-1 rounded-2xl border bg-popover p-1.5 text-popover-foreground shadow-xl shadow-black/10 transition-all duration-200 dark:shadow-black/50',
                                        moreOpen ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0',
                                    )}>
                                    {moreItems.map((m) => (
                                        <MoreLink key={m.name} item={m} pathname={pathname} onNavigate={goTo} onClose={() => setMoreOpen(false)} />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right side */}
                        <div className="ml-auto flex items-center gap-1.5 lg:ml-0">
                            <ThemeToggle className="size-10 rounded-xl" />
                            <Link
                                href="/sign-in"
                                className="hidden h-10 items-center whitespace-nowrap rounded-xl border px-4 text-sm font-medium transition-colors hover:bg-accent sm:flex">
                                Sign in
                            </Link>
                            <button
                                type="button"
                                onClick={askIris}
                                className="hidden h-10 items-center gap-2 whitespace-nowrap rounded-xl bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-85 sm:flex">
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
                            'mt-2 origin-top overflow-y-auto overscroll-contain rounded-2xl border bg-background/95 shadow-xl shadow-black/10 backdrop-blur-xl transition-all duration-300 lg:hidden dark:shadow-black/50',
                            menuOpen ? 'max-h-[calc(100dvh-6rem)] scale-100 p-2 opacity-100' : 'pointer-events-none max-h-0 scale-95 border-transparent p-0 opacity-0',
                        )}>
                        <div className="grid grid-cols-2 gap-1">
                            {sectionItems.map((item) => (
                                <SectionLink
                                    key={item.section}
                                    section={item.section}
                                    onNavigate={() => goTo(item.section)}
                                    className={cn(
                                        'flex items-center gap-2.5 rounded-xl px-3 py-3 text-sm font-medium transition-colors hover:bg-accent',
                                        active === item.section && 'bg-accent',
                                    )}>
                                    <item.icon className="size-4" />
                                    {item.name}
                                </SectionLink>
                            ))}
                        </div>
                        <p className="px-3 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">More</p>
                        <div className="grid grid-cols-2 gap-1">
                            {moreItems.map((m) => (
                                <MoreLink key={m.name} item={m} pathname={pathname} onNavigate={goTo} onClose={() => setMenuOpen(false)} compact />
                            ))}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 sm:hidden">
                            <Link
                                href="/sign-in"
                                onClick={() => setMenuOpen(false)}
                                className="flex h-11 items-center justify-center rounded-xl border text-sm font-medium">
                                Sign in
                            </Link>
                            <button
                                type="button"
                                onClick={askIris}
                                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-foreground text-sm font-medium text-background">
                                <MessageCircle className="size-4" />
                                Ask Iris
                            </button>
                        </div>
                    </div>
                </div>
            </header>
        </>
    )
}

function MoreLink({
    item,
    pathname,
    onNavigate,
    onClose,
    compact,
}: {
    item: MoreItem
    pathname: string
    onNavigate: (section: string) => void
    onClose: () => void
    compact?: boolean
}) {
    const current = 'href' in item && pathname === item.href
    const className = cn(
        'flex items-start gap-3 rounded-xl transition-colors hover:bg-accent',
        compact ? 'items-center px-3 py-2.5 text-sm' : 'p-2.5',
        current && 'bg-accent',
    )
    const body = compact ? (
        <>
            <item.icon className="size-4 shrink-0" />
            <span className="truncate">{item.name}</span>
            {item.badge && <span className="ml-auto rounded-full border px-1.5 text-[10px] text-muted-foreground">{item.badge}</span>}
        </>
    ) : (
        <>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background">
                <item.icon className="size-4" />
            </span>
            <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-medium">
                    {item.name}
                    {item.badge && <span className="rounded-full border px-1.5 text-[10px] font-normal text-muted-foreground">{item.badge}</span>}
                </span>
                <span className="block text-xs text-muted-foreground">{item.description}</span>
            </span>
        </>
    )

    if ('section' in item) {
        return (
            <SectionLink
                section={item.section}
                role="menuitem"
                onNavigate={() => {
                    onNavigate(item.section)
                    onClose()
                }}
                className={className}>
                {body}
            </SectionLink>
        )
    }
    return (
        <Link href={item.href} role="menuitem" aria-current={current ? 'page' : undefined} onClick={onClose} className={className}>
            {body}
        </Link>
    )
}

/** The Iris mark (a transparent white PNG): black in light mode, white in dark mode. */
export const Logo = ({ className }: { className?: string }) => {
    return <Image src="/iris-logo.png" alt="" width={663} height={259} className={cn('h-8 w-auto object-contain invert dark:invert-0', className)} />
}
