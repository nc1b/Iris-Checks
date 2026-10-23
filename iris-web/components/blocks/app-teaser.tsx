'use client'
import { Check, Clock, Lock, MessageCircle, Timer } from 'lucide-react'
import { useEffect, useState } from 'react'
import IPhoneMockup from '@/components/ui/iphone-mockup'
import { CHECKS, SCAN_STEPS } from '@/lib/checks'
import { cn } from '@/lib/utils'

/**
 * "Coming soon" preview of the planned app: a step list, an iPhone that plays each
 * step of the scan, and the three checks it feeds. All numbers are example data.
 */

const STEP_MS = 4200
// The screens are laid out 270px wide and zoomed to fill the 393px iPhone 15 Pro screen.
const CONTENT_ZOOM = 393 / 270

export function AppTeaser() {
    const [step, setStep] = useState(0)
    const [paused, setPaused] = useState(false)

    useEffect(() => {
        // Plays on every device (like the FAQ roller); hovering or picking a step pauses it.
        if (paused) return
        const id = window.setInterval(() => setStep((s) => (s + 1) % SCAN_STEPS.length), STEP_MS)
        return () => window.clearInterval(id)
    }, [paused, step])

    const choose = (i: number) => {
        setStep(i)
        setPaused(true)
    }

    return (
        <div className="relative overflow-hidden">
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 [background-image:radial-gradient(var(--color-border)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]"
            />

            <div className="relative mx-auto max-w-6xl px-6 py-24">
                <div className="mx-auto max-w-2xl text-center">
                    <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium">
                        <Clock className="size-3.5" /> Coming soon
                    </span>
                    <h2 className="mt-5 text-balance text-3xl font-bold md:text-5xl">A sneak peek at the app</h2>
                    <p className="mt-4 text-muted-foreground">
                        One scan, about 30 seconds, three checks. This is how it&apos;s planned to feel. Everything here is example data while we
                        test on real phones.
                    </p>
                </div>

                <div className="mt-14 grid items-center gap-10 lg:grid-cols-[1fr_auto_1fr] lg:gap-8">
                    {/* Steps */}
                    <div
                        role="tablist"
                        aria-label="Scan steps"
                        className="order-2 grid gap-2 sm:grid-cols-2 lg:order-1 lg:grid-cols-1"
                        onPointerLeave={() => setPaused(false)}>
                        {SCAN_STEPS.map((s, i) => {
                            const active = step === i
                            return (
                                <button
                                    key={s.title}
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() => choose(i)}
                                    onPointerEnter={() => active && setPaused(true)}
                                    className={cn(
                                        'relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300',
                                        active
                                            ? 'border-foreground/15 bg-background shadow-lg shadow-black/5 dark:shadow-black/40'
                                            : 'border-transparent hover:border-border hover:bg-background/60',
                                    )}>
                                    <div className="flex items-start gap-3">
                                        <span
                                            className={cn(
                                                'flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors',
                                                active ? 'border-foreground bg-foreground text-background' : 'bg-background text-muted-foreground',
                                            )}>
                                            {i + 1}
                                        </span>
                                        <span>
                                            <span className="block font-medium">{s.title}</span>
                                            <span className="mt-0.5 block text-sm text-muted-foreground">{s.body}</span>
                                        </span>
                                    </div>
                                    {active && (
                                        <span
                                            key={`${step}-${paused}`}
                                            aria-hidden
                                            className={cn(
                                                'absolute bottom-0 left-0 h-0.5 bg-foreground',
                                                paused ? 'w-full' : 'animate-[teaser-progress_linear_forwards]',
                                            )}
                                            style={{ animationDuration: `${STEP_MS}ms` }}
                                        />
                                    )}
                                </button>
                            )
                        })}
                    </div>

                    {/* Phone */}
                    <div className="relative order-1 mx-auto [--preview-scale:0.6] min-[375px]:[--preview-scale:0.66] lg:order-2">
                        <div aria-hidden className="absolute left-1/2 top-1/2 size-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-foreground/10" />
                        <div aria-hidden className="absolute left-1/2 top-1/2 size-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-foreground/10" />
                        <div aria-hidden className="absolute inset-x-8 bottom-4 top-16 rounded-[3rem] bg-foreground/20 blur-3xl" />

                        <div className="relative flex motion-safe:animate-[teaser-float_7s_ease-in-out_infinite]">
                            <IPhoneMockup
                                model="15-pro"
                                color="space-black"
                                safeArea={false}
                                shadow="0 40px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08)"
                                style={{ zoom: 'var(--preview-scale)' }}>
                                <div className="relative overflow-hidden text-white" style={{ width: 270, height: 852 / CONTENT_ZOOM, zoom: CONTENT_ZOOM }}>
                                    <StatusBar />
                                    <Screen active={step === 0}>
                                        <AlignScreen />
                                    </Screen>
                                    <Screen active={step === 1}>
                                        <FlashScreen active={step === 1} />
                                    </Screen>
                                    <Screen active={step === 2}>
                                        <EachEyeScreen active={step === 2} />
                                    </Screen>
                                    <Screen active={step === 3}>
                                        <ResultScreen active={step === 3} />
                                    </Screen>
                                </div>
                            </IPhoneMockup>
                        </div>

                        <FloatingChip className="-top-4 left-0 -translate-x-1/4" icon={<Lock className="size-3.5" />}>
                            Images stay on your phone
                        </FloatingChip>
                        <FloatingChip className="-bottom-4 right-0 translate-x-1/4" icon={<Timer className="size-3.5" />}>
                            About 30 seconds
                        </FloatingChip>
                    </div>

                    {/* Checks */}
                    <div className="order-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                        {CHECKS.map((c, i) => (
                            <div
                                key={c.id}
                                className={cn(
                                    'rounded-2xl border bg-background/80 p-4 backdrop-blur transition-all duration-500',
                                    step === 3 ? 'border-foreground/25 shadow-lg shadow-black/5 dark:shadow-black/40' : 'opacity-90',
                                )}
                                style={{ transitionDelay: step === 3 ? `${i * 120}ms` : '0ms' }}>
                                <div className="flex items-center gap-3">
                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
                                        <c.icon className="size-4" />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="font-semibold leading-tight">{c.name}</p>
                                        <p className="text-xs text-muted-foreground">{c.signal}</p>
                                    </div>
                                </div>
                                <p className="mt-3 text-sm text-muted-foreground">{c.measures}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <p className="mt-10 text-center text-xs text-muted-foreground">
                    Concept preview with example data. Not a health assessment. The final app may look different.
                </p>
            </div>
        </div>
    )
}

function FloatingChip({ className, icon, children }: { className: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <span
            className={cn(
                'absolute z-10 hidden items-center gap-2 whitespace-nowrap rounded-full border bg-background/90 px-3 py-1.5 text-xs font-medium shadow-lg shadow-black/5 backdrop-blur xl:inline-flex dark:shadow-black/40',
                className,
            )}>
            {icon}
            {children}
        </span>
    )
}

function StatusBar() {
    return (
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 pt-3 text-[10px] font-semibold text-white/80">
            <span>9:41</span>
            <span className="h-2 w-3 rounded-[2px] border border-white/70" />
        </div>
    )
}

function Screen({ active, children }: { active: boolean; children: React.ReactNode }) {
    return (
        <div
            aria-hidden={!active}
            className={cn(
                'absolute inset-0 transition-all duration-500 ease-out',
                active ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-3 scale-[0.98] opacity-0',
            )}>
            {children}
        </div>
    )
}

function Eye({ pupil = 0.42, covered = false, className }: { pupil?: number; covered?: boolean; className?: string }) {
    return (
        <svg viewBox="0 0 120 60" className={className} aria-hidden>
            <path d="M6 30 C 30 4, 90 4, 114 30 C 90 56, 30 56, 6 30 Z" fill="white" opacity="0.92" />
            <circle cx="60" cy="30" r="19" fill="#5d7384" />
            <circle cx="60" cy="30" r="19" fill="url(#teaserIris)" />
            <circle cx="60" cy="30" r={19 * pupil} fill="#050505" style={{ transition: 'r 0.35s ease-out' }} />
            <circle cx="66" cy="23" r="3.2" fill="white" opacity="0.9" />
            <rect
                x="0"
                y="0"
                width="120"
                height="60"
                rx="30"
                fill="#1c1c1e"
                style={{ opacity: covered ? 1 : 0, transition: 'opacity 0.4s ease-out' }}
            />
            <defs>
                <radialGradient id="teaserIris">
                    <stop offset="0.35" stopColor="#1d2730" />
                    <stop offset="0.55" stopColor="#8fa6b5" />
                    <stop offset="0.85" stopColor="#4d6273" />
                    <stop offset="1" stopColor="#0b1016" />
                </radialGradient>
            </defs>
        </svg>
    )
}

function ScreenTitle({ step, title, sub }: { step: string; title: string; sub?: string }) {
    return (
        <div className="text-center">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/50">{step}</p>
            <p className="mt-1 text-lg font-semibold">{title}</p>
            {sub && <p className="mt-0.5 text-[11px] text-white/50">{sub}</p>}
        </div>
    )
}

function AlignScreen() {
    return (
        <div className="flex h-full flex-col bg-[radial-gradient(ellipse_at_top,#2e2e2e,#0a0a0a_70%)] px-5 pb-8 pt-12">
            <ScreenTitle step="Step 1 of 4" title="Line up your eyes" sub="Dim room, phone at eye level" />
            <div className="relative mx-auto mt-6 flex h-60 w-44 items-center justify-center rounded-[50%] border-2 border-dashed border-white/35">
                <div className="flex gap-3">
                    <Eye className="w-[4.25rem] motion-safe:animate-[teaser-scan_2.4s_ease-in-out_infinite]" />
                    <Eye className="w-[4.25rem] motion-safe:animate-[teaser-scan_2.4s_ease-in-out_infinite]" />
                </div>
                <div className="absolute inset-x-6 top-1/2 h-px bg-white/50 motion-safe:animate-[teaser-sweep_2.4s_ease-in-out_infinite]" />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-2 text-[11px]">
                {['Face found', 'Eyes open', 'Good distance', 'Pupils visible'].map((t, i) => (
                    <span
                        key={t}
                        className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2 py-1.5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1"
                        style={{ animationDelay: `${300 + i * 250}ms`, animationFillMode: 'both' }}>
                        <Check className="size-3" /> {t}
                    </span>
                ))}
            </div>
            <div className="mt-auto rounded-full bg-white py-2.5 text-center text-sm font-semibold text-black">Start scan</div>
        </div>
    )
}

function FlashScreen({ active }: { active: boolean }) {
    return (
        <div className={cn('flex h-full flex-col items-center justify-center bg-black px-5', active && 'motion-safe:animate-[teaser-flash_4.2s_ease-out_forwards]')}>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/60 mix-blend-difference">Step 2 of 4 · flash 1 of 3</p>
            <div className="relative mt-10 flex size-32 items-center justify-center">
                <span className="absolute inset-0 rounded-full border border-white/30 motion-safe:animate-ping" />
                <span className="size-3 rounded-full bg-white mix-blend-difference" />
            </div>
            <p className="mt-10 text-sm font-medium text-white/80 mix-blend-difference">Keep both eyes on the dot</p>
            <p className="mt-1 text-center text-xs text-white/50 mix-blend-difference">Measures the pupil reflex and takes the flash photos</p>
        </div>
    )
}

function EachEyeScreen({ active }: { active: boolean }) {
    const [covered, setCovered] = useState<'left' | 'right'>('right')

    useEffect(() => {
        if (!active) return
        const id = window.setInterval(() => setCovered((c) => (c === 'right' ? 'left' : 'right')), 2000)
        return () => window.clearInterval(id)
    }, [active])

    return (
        <div className="flex h-full flex-col bg-[radial-gradient(ellipse_at_top,#2e2e2e,#0a0a0a_70%)] px-5 pb-8 pt-12">
            <ScreenTitle step="Step 3 of 4" title={`Cover your ${covered} eye`} sub="Then the screen flashes once" />
            <div className="mt-10 flex items-center justify-center gap-4">
                {(['left', 'right'] as const).map((side) => (
                    <div key={side} className="flex flex-col items-center gap-2">
                        <Eye className="w-24" covered={covered === side} pupil={covered === side ? 0.42 : 0.3} />
                        <span className="text-[10px] uppercase tracking-widest text-white/50">{side}</span>
                    </div>
                ))}
            </div>
            <div className="mt-10 rounded-2xl bg-white/[0.06] p-3 text-[11px] text-white/70 ring-1 ring-white/10">
                Lighting one eye at a time shows whether one side senses light more weakly, a possible sign of optic-nerve damage.
            </div>
            <div className="mt-auto">
                <div className="flex justify-between text-[10px] text-white/50">
                    <span>Flash {covered === 'right' ? 2 : 3} of 3</span>
                    <span>{covered === 'right' ? 'Left eye lit' : 'Right eye lit'}</span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-white transition-[width] duration-700" style={{ width: covered === 'right' ? '66%' : '100%' }} />
                </div>
            </div>
        </div>
    )
}

function Pill({ children }: { children: React.ReactNode }) {
    return <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-black">{children}</span>
}

function ResultScreen({ active }: { active: boolean }) {
    // Example light-reflex curve: flat, flash, quick dip, slow recovery.
    const curve = 'M4 14 L40 14 L46 15 C 52 17, 56 34, 66 36 C 82 38, 96 24, 110 20 C 124 17, 140 15, 156 14'
    return (
        <div className="flex h-full flex-col px-5 pb-8 pt-12">
            <ScreenTitle step="Step 4 of 4" title="Your three checks" sub="Example data · not a diagnosis" />

            <div className="mt-5 space-y-2.5">
                <ResultCard delay={0} active={active} title="Diabetes" note="Pupil reflex in the typical range" pill="Typical">
                    <svg viewBox="0 0 160 42" className="mt-2 w-full" aria-hidden>
                        <rect x="40" y="2" width="12" height="38" fill="white" opacity="0.08" />
                        <path
                            d={curve}
                            fill="none"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            pathLength={1}
                            strokeDasharray="1"
                            strokeDashoffset={active ? 0 : 1}
                            style={{ transition: active ? 'stroke-dashoffset 1.6s ease-out 0.3s' : 'none' }}
                        />
                    </svg>
                </ResultCard>

                <ResultCard delay={150} active={active} title="Glaucoma" note="Left and right reacted evenly" pill="Even">
                    {[
                        { eye: 'Left lit', v: 92 },
                        { eye: 'Right lit', v: 88 },
                    ].map((r) => (
                        <div key={r.eye} className="mt-1.5 flex items-center gap-2 text-[10px] text-white/55">
                            <span className="w-11">{r.eye}</span>
                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                                <span
                                    className="block h-full rounded-full bg-white/80 transition-[width] duration-1000 ease-out"
                                    style={{ width: active ? `${r.v}%` : '0%', transitionDelay: active ? '0.5s' : '0s' }}
                                />
                            </span>
                        </div>
                    ))}
                </ResultCard>

                <ResultCard delay={300} active={active} title="Cataracts" note="No obvious haze in the flash photo" pill="Clear">
                    <div className="mt-2 flex items-center gap-3">
                        {['L', 'R'].map((s) => (
                            <span key={s} className="flex items-center gap-1.5 text-[10px] text-white/55">
                                <span className="relative flex size-6 items-center justify-center rounded-full bg-[#5d7384]">
                                    <span className="size-3 rounded-full bg-black" />
                                    <span className="absolute right-1.5 top-1.5 size-1 rounded-full bg-white" />
                                </span>
                                {s}
                            </span>
                        ))}
                        <span className="ml-auto text-[10px] text-white/45">haze score 0.08</span>
                    </div>
                </ResultCard>
            </div>

            <div className="mt-auto flex items-center justify-center gap-2 rounded-full bg-white py-2.5 text-xs font-semibold text-black">
                <MessageCircle className="size-3.5" /> Ask Iris what this means
            </div>
        </div>
    )
}

function ResultCard({ title, note, pill, delay, active, children }: { title: string; note: string; pill: string; delay: number; active: boolean; children: React.ReactNode }) {
    return (
        <div
            className="rounded-2xl bg-white/[0.07] p-3 ring-1 ring-white/10 transition-all duration-500"
            style={{ opacity: active ? 1 : 0, transform: active ? 'none' : 'translateY(6px)', transitionDelay: active ? `${delay}ms` : '0ms' }}>
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">{title}</span>
                <Pill>{pill}</Pill>
            </div>
            <p className="mt-0.5 text-[10px] text-white/50">{note}</p>
            {children}
        </div>
    )
}
