'use client'
import { Button } from '@/components/ui/button'
import { PendingSectionScroll, SectionLink } from '@/components/blocks/section-link'
import { SiteNav } from '@/components/blocks/site-nav'
import { ArrowDown, ArrowRight, Clock, ScanEye } from 'lucide-react'
import { useEffect, useRef } from 'react'

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

// Staggered entrance for the hero text (tw-animate-css).
const enter = 'animate-in fade-in slide-in-from-bottom-6 [animation-duration:900ms] [animation-fill-mode:both] motion-reduce:animate-none'

export function HeroSection({ children }: { children?: React.ReactNode }) {
    const imageRef = useRef<HTMLDivElement>(null)
    const textRef = useRef<HTMLDivElement>(null)

    // Scroll-linked parallax: the photo drifts and zooms slowly, the text eases away.
    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
        let frame = 0
        const update = () => {
            frame = 0
            const y = Math.min(window.scrollY, 900)
            if (imageRef.current) imageRef.current.style.transform = `translate3d(0, ${y * 0.25}px, 0) scale(${1 + y * 0.0003})`
            if (textRef.current) {
                textRef.current.style.transform = `translate3d(0, ${y * -0.08}px, 0)`
                textRef.current.style.opacity = String(Math.max(0, 1 - y / 700))
            }
        }
        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(update)
        }
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => {
            cancelAnimationFrame(frame)
            window.removeEventListener('scroll', onScroll)
        }
    }, [])

    return (
        <>
            <SiteNav />
            <PendingSectionScroll />

            <main>
                <section className="overflow-hidden">
                    <div className="relative mx-auto max-w-5xl px-6 py-28 lg:pb-24 lg:pt-36">
                        <div className="lg:flex lg:items-center lg:gap-12">
                            <div
                                ref={textRef}
                                className="relative z-10 mx-auto max-w-xl text-center will-change-transform lg:ml-0 lg:w-1/2 lg:text-left">
                                <SectionLink
                                    section="coming-soon"
                                    className={`${enter} group rounded-lg mx-auto flex w-fit items-center gap-2 border bg-background p-1 pr-3 transition-colors hover:bg-accent lg:ml-0`}>
                                    <span className="bg-muted rounded-[calc(var(--radius)-0.25rem)] px-2 py-1 text-xs">Coming soon</span>
                                    <span className="text-sm">Eye checks by phone</span>
                                    <span className="bg-(--color-border) block h-4 w-px"></span>

                                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                                </SectionLink>

                                <h1
                                    className={`${enter} mt-10 text-balance text-4xl font-bold md:text-5xl xl:text-5xl`}
                                    style={{ animationDelay: '120ms' }}>
                                    Check your eyes with just your phone
                                </h1>
                                <p
                                    className={`${enter} mt-8 text-muted-foreground`}
                                    style={{ animationDelay: '240ms' }}>
                                    Iris is building a 10-second eye check that uses your phone&apos;s camera and screen light to measure how your
                                    pupils respond, then compares the result with published research. No extra hardware needed.
                                </p>

                                <div
                                    className={enter}
                                    style={{ animationDelay: '360ms' }}>
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
                            <div className="relative h-full overflow-hidden rounded-3xl animate-in fade-in zoom-in-95 [animation-duration:1200ms] motion-reduce:animate-none">
                                <div
                                    ref={imageRef}
                                    className="h-full w-full will-change-transform">
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

                        <SectionLink
                            section="how-it-works"
                            aria-label="Scroll down"
                            className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 rounded-full border bg-background/70 p-2 backdrop-blur transition-colors hover:bg-accent lg:block">
                            <ArrowDown className="size-4 animate-bounce motion-reduce:animate-none" />
                        </SectionLink>
                    </div>
                </section>
                {children}
            </main>
        </>
    )
}
