'use client'
import { Button } from '@/components/ui/button'
import { ArrowRight, Clock, Menu, ScanEye, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const menuItems = [
    { name: 'How it works', href: '#how-it-works' },
    { name: 'Research', href: '#research' },
    { name: 'Coming soon', href: '#coming-soon' },
    { name: 'About', href: '#about' },
]

// Example photos of people using their phones close to their eyes (Unsplash, free licence).
// Shown in grayscale to fit the black-and-white theme.
const heroImages = {
    light: {
        src: 'https://images.unsplash.com/photo-1683972606206-bcb0525a9f88?w=2400&q=80&auto=format&fit=crop',
        alt: 'A woman holding her phone up at eye level, looking at the screen',
    },
    dark: {
        src: 'https://images.unsplash.com/photo-1576176243977-7c62b6472a31?w=2400&q=80&auto=format&fit=crop',
        alt: 'A person in a dark room holding a phone up close to their face',
    },
}

export function HeroSection({ children }: { children?: React.ReactNode }) {
    const [menuState, setMenuState] = useState(false)
    return (
        <>
            <header>
                <nav
                    data-state={menuState && 'active'}
                    className="group fixed z-20 w-full border-b border-dashed bg-background/90 backdrop-blur md:relative lg:bg-transparent">
                    <div className="m-auto max-w-5xl px-6">
                        <div className="flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
                            <div className="flex w-full justify-between lg:w-auto">
                                <Link
                                    href="/"
                                    aria-label="Iris home"
                                    className="flex items-center gap-2">
                                    <Logo />
                                    <span className="text-lg font-semibold tracking-tight">iris</span>
                                </Link>

                                <button
                                    onClick={() => setMenuState(!menuState)}
                                    aria-label={menuState == true ? 'Close Menu' : 'Open Menu'}
                                    className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden">
                                    <Menu className="group-data-[state=active]:rotate-180 group-data-[state=active]:scale-0 group-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                                    <X className="group-data-[state=active]:rotate-0 group-data-[state=active]:scale-100 group-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
                                </button>
                            </div>

                            <div className="bg-background group-data-[state=active]:block lg:group-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border p-6 shadow-2xl shadow-neutral-300/20 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent">
                                <div className="lg:pr-4">
                                    <ul className="space-y-6 text-base lg:flex lg:gap-8 lg:space-y-0 lg:text-sm">
                                        {menuItems.map((item, index) => (
                                            <li key={index}>
                                                <Link
                                                    href={item.href}
                                                    onClick={() => setMenuState(false)}
                                                    className="text-muted-foreground hover:text-foreground block duration-150">
                                                    <span>{item.name}</span>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit lg:border-l lg:pl-6">
                                    <Button
                                        asChild
                                        variant="outline"
                                        size="sm">
                                        <Link href="#coming-soon" onClick={() => setMenuState(false)}>
                                            <span>Log in</span>
                                        </Link>
                                    </Button>

                                    <Button
                                        asChild
                                        size="sm">
                                        <Link href="#coming-soon" onClick={() => setMenuState(false)}>
                                            <span>Get started</span>
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </nav>
            </header>

            <main>
                <section className="overflow-hidden">
                    <div className="relative mx-auto max-w-5xl px-6 py-28 lg:py-20">
                        <div className="lg:flex lg:items-center lg:gap-12">
                            <div className="relative z-10 mx-auto max-w-xl text-center lg:ml-0 lg:w-1/2 lg:text-left">
                                <Link
                                    href="#coming-soon"
                                    className="rounded-lg mx-auto flex w-fit items-center gap-2 border bg-background p-1 pr-3 lg:ml-0">
                                    <span className="bg-muted rounded-[calc(var(--radius)-0.25rem)] px-2 py-1 text-xs">Coming soon</span>
                                    <span className="text-sm">Eye checks by phone</span>
                                    <span className="bg-(--color-border) block h-4 w-px"></span>

                                    <ArrowRight className="size-4" />
                                </Link>

                                <h1 className="mt-10 text-balance text-4xl font-bold md:text-5xl xl:text-5xl">Check your eyes with just your phone</h1>
                                <p className="mt-8 text-muted-foreground">
                                    Iris is building a 10-second eye check that uses your phone&apos;s camera and screen light to measure how your
                                    pupils respond, then compares the result with published research. No extra hardware needed.
                                </p>

                                <div>
                                    <div
                                        id="scan-status"
                                        className="mx-auto my-10 max-w-sm lg:my-12 lg:ml-0 lg:mr-auto">
                                        <div className="bg-background relative grid grid-cols-[1fr_auto] items-center rounded-[1rem] border pr-1 shadow shadow-neutral-950/5">
                                            <ScanEye className="text-muted-foreground pointer-events-none absolute inset-y-0 left-5 my-auto size-5" />

                                            <p className="flex h-14 items-center pl-12 text-left text-sm text-muted-foreground">
                                                Eye scanning isn&apos;t live yet
                                            </p>

                                            <div className="md:pr-1.5 lg:pr-0">
                                                <Button
                                                    disabled
                                                    aria-label="Eye scanning coming soon">
                                                    <span className="hidden md:block">Coming soon</span>
                                                    <Clock
                                                        className="relative mx-auto size-5 md:hidden"
                                                        strokeWidth={2}
                                                    />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    <ul className="list-inside list-disc space-y-2 text-left sm:mx-auto sm:w-fit lg:mx-0">
                                        <li>Uses only your phone&apos;s camera and screen</li>
                                        <li>Results explained in plain language</li>
                                        <li>Built on published eye research</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div className="absolute inset-0 -mx-4 rounded-3xl p-3 lg:col-span-3">
                            <div aria-hidden className="absolute z-[1] inset-0 bg-gradient-to-r from-background from-35% to-background/30 lg:to-transparent" />
                            <div className="relative h-full overflow-hidden rounded-3xl">
                                <img
                                    className="hidden h-full w-full object-cover object-right grayscale dark:block"
                                    src={heroImages.dark.src}
                                    alt={heroImages.dark.alt}
                                    width={2400}
                                    height={3000}
                                />
                                <img
                                    className="h-full w-full object-cover object-right grayscale dark:hidden"
                                    src={heroImages.light.src}
                                    alt={heroImages.light.alt}
                                    width={2400}
                                    height={1600}
                                />
                            </div>
                        </div>
                    </div>
                </section>
                {children}
            </main>
        </>
    )
}

/**
 * The uploaded logo file (white mark on black) used as-is. The mark sits in the
 * middle of a wide canvas, so the image is scaled up inside a small frame to crop
 * the empty space. In light mode it is inverted to a black mark on white.
 */
const Logo = ({ className }: { className?: string }) => {
    return (
        <span className={cn('relative block h-8 w-[5.25rem] overflow-hidden', className)}>
            <Image
                src="/iris-logo.jpg"
                alt=""
                width={1459}
                height={980}
                priority
                className="absolute left-1/2 top-1/2 h-auto w-[220%] max-w-none -translate-x-1/2 -translate-y-1/2 grayscale invert dark:invert-0"
            />
        </span>
    )
}
