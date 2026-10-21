'use client'
import { Menu, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const menuItems = [
    { name: 'How it works', href: '/#how-it-works' },
    { name: 'Research', href: '/research' },
    { name: 'Supporters', href: '/#supporters' },
    { name: 'About', href: '/#about' },
]

/**
 * Top bar that slides down on load, turns into a floating pill once you scroll,
 * hides while scrolling down and comes back down as soon as you scroll up.
 * A thin line along its bottom edge shows how far down the page you are.
 */
export function SiteNav() {
    const [menuOpen, setMenuOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)
    const [hidden, setHidden] = useState(false)
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        let lastY = window.scrollY
        let frame = 0
        const update = () => {
            frame = 0
            const y = window.scrollY
            const max = document.documentElement.scrollHeight - window.innerHeight
            setScrolled(y > 24)
            setProgress(max > 0 ? Math.min(1, y / max) : 0)
            if (Math.abs(y - lastY) > 6) {
                setHidden(y > lastY && y > 320)
                lastY = y
            }
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
    }, [])

    return (
        <header
            className={cn(
                'fixed inset-x-0 top-0 z-30 px-3 transition-transform duration-500 ease-out motion-reduce:transition-none',
                hidden && !menuOpen && '-translate-y-[130%]',
            )}>
            <nav
                data-state={menuOpen ? 'active' : undefined}
                className={cn(
                    'group relative mx-auto overflow-hidden border transition-all duration-500 ease-out animate-in fade-in slide-in-from-top-full [animation-duration:800ms] motion-reduce:animate-none',
                    scrolled || menuOpen
                        ? cn(
                              'mt-3 max-w-3xl rounded-2xl border-border shadow-lg shadow-black/5 backdrop-blur-xl dark:shadow-black/40',
                              menuOpen ? 'bg-background/95' : 'bg-background/80',
                          )
                        : 'mt-0 max-w-5xl rounded-none border-transparent bg-transparent',
                )}>
                <div className={cn('transition-all duration-500', scrolled ? 'px-4' : 'px-6')}>
                    <div className={cn('flex items-center justify-between transition-all duration-500', scrolled ? 'py-2' : 'py-4')}>
                        <Link
                            href="/"
                            aria-label="Iris home"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2">
                            <Logo className={cn('transition-all duration-500', scrolled ? 'h-7 w-[4.5rem]' : 'h-8 w-[5.25rem]')} />
                            <span className="text-lg font-semibold tracking-tight">iris</span>
                        </Link>

                        <ul className="hidden items-center gap-1 text-sm lg:flex">
                            {menuItems.map((item) => (
                                <li key={item.name}>
                                    <Link
                                        href={item.href}
                                        className="text-muted-foreground hover:text-foreground hover:bg-accent relative rounded-full px-3 py-1.5 transition-colors duration-200">
                                        {item.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>

                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            aria-label={menuOpen ? 'Close Menu' : 'Open Menu'}
                            aria-expanded={menuOpen}
                            className="relative -mr-2 block cursor-pointer p-2.5 lg:hidden">
                            <Menu className="group-data-[state=active]:rotate-180 group-data-[state=active]:scale-0 group-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                            <X className="group-data-[state=active]:rotate-0 group-data-[state=active]:scale-100 group-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
                        </button>
                    </div>

                    <div
                        className={cn(
                            'grid transition-all duration-300 ease-out lg:hidden',
                            menuOpen ? 'grid-rows-[1fr] pb-4 opacity-100' : 'grid-rows-[0fr] opacity-0',
                        )}>
                        <ul className="space-y-1 overflow-hidden text-base">
                            {menuItems.map((item) => (
                                <li key={item.name}>
                                    <Link
                                        href={item.href}
                                        onClick={() => setMenuOpen(false)}
                                        className="text-muted-foreground hover:text-foreground hover:bg-accent block rounded-xl px-3 py-2.5 duration-150">
                                        {item.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div
                    aria-hidden
                    className={cn('bg-foreground absolute bottom-0 left-0 h-px origin-left transition-opacity duration-300', scrolled ? 'opacity-100' : 'opacity-0')}
                    style={{ width: '100%', transform: `scaleX(${progress})` }}
                />
            </nav>
        </header>
    )
}

/**
 * The uploaded logo file (white mark on black) used as-is. The mark sits in the
 * middle of a wide canvas, so the image is scaled up inside a small frame to crop
 * the empty space. In light mode it is inverted to a black mark on white.
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
