'use client'
import { BookOpen, HeartHandshake, Home, Info, ListChecks } from 'lucide-react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { SectionLink } from '@/components/blocks/section-link'
import { ThemeToggle } from '@/components/blocks/theme-toggle'
import { NavBar, type NavItem } from '@/components/ui/tubelight-navbar'
import { cn } from '@/lib/utils'

const navItems: NavItem[] = [
    { name: 'Home', section: 'home', icon: Home },
    { name: 'How it works', section: 'how-it-works', icon: ListChecks },
    { name: 'Research', url: '/research', icon: BookOpen },
    { name: 'Supporters', section: 'supporters', icon: HeartHandshake },
    { name: 'About', section: 'about', icon: Info },
]

const spySections = ['how-it-works', 'supporters', 'about'] as const
const sectionToName: Record<string, string> = { home: 'Home', 'how-it-works': 'How it works', supporters: 'Supporters', about: 'About' }

/**
 * Top bar: slides down on load and is always visible at the top of the page.
 * It tucks away while you scroll down and drops back as soon as you scroll up.
 * The tubelight pill lights up the section you're reading; a thin line across the
 * very top shows scroll progress.
 */
export function SiteNav() {
    const pathname = usePathname()
    const [scrolled, setScrolled] = useState(false)
    const [hidden, setHidden] = useState(false)
    const [progress, setProgress] = useState(0)
    const [section, setSection] = useState<string>('home')

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
            if (max > 0 && y >= max - 4) current = 'about'
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

    const activeName = pathname === '/research' ? 'Research' : pathname === '/' ? sectionToName[section] : null

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
                    hidden && '-translate-y-[140%]',
                )}>
                <div
                    className={cn(
                        'mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 transition-all duration-500 ease-out animate-in fade-in slide-in-from-top-full [animation-duration:800ms] motion-reduce:animate-none sm:px-6',
                        scrolled ? 'pt-2' : 'pt-4',
                    )}>
                    <SectionLink
                        section="home"
                        aria-label="Iris home"
                        className="flex h-10 shrink-0 items-center gap-2 rounded-full border bg-background/70 px-2 sm:h-11 shadow-lg shadow-black/5 backdrop-blur-lg dark:shadow-black/40 sm:pl-3 sm:pr-4">
                        <Logo className="h-6 w-12 sm:h-7 sm:w-[4.5rem]" />
                        <span className="hidden text-base font-semibold tracking-tight sm:inline">iris</span>
                    </SectionLink>

                    <NavBar
                        items={navItems}
                        activeName={activeName}
                        onSelect={(name) => {
                            const entry = Object.entries(sectionToName).find(([, n]) => n === name)
                            if (entry) setSection(entry[0])
                        }}
                    />

                    <ThemeToggle className="size-10 shrink-0 sm:size-11 shadow-lg shadow-black/5 backdrop-blur-lg dark:shadow-black/40" />
                </div>
            </header>
        </>
    )
}

/**
 * The uploaded logo file (white mark on black) used as-is. The mark sits in the
 * middle of a wide canvas, so the image is scaled up inside a small frame to crop
 * the empty space. In light mode it is inverted to a black mark on white, and the
 * blend mode hides the image's background on any surface.
 */
export const Logo = ({ className }: { className?: string }) => {
    return (
        <span className={cn('relative block h-8 w-[5.25rem] overflow-hidden', className)}>
            <Image
                src="/iris-logo.jpg"
                alt=""
                width={1459}
                height={980}
                priority
                className="absolute left-1/2 top-1/2 h-auto w-[220%] max-w-none -translate-x-1/2 -translate-y-1/2 grayscale invert mix-blend-multiply dark:invert-0 dark:mix-blend-screen"
            />
        </span>
    )
}
