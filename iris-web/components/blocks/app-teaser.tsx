'use client'
import { Activity, Bot, Check, CheckCircle2, ScanEye, Sun } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import IPhoneMockup from '@/components/ui/iphone-mockup'
import { cn } from '@/lib/utils'

/**
 * Concept preview of the coming app: a phone that cycles through the planned
 * screens (line up → flash → light-reflex curve → plain-language result).
 * All numbers are example data. Tilts toward the cursor.
 */

const steps = [
    { id: 'align', label: 'Line up', icon: ScanEye },
    { id: 'flash', label: 'Flash', icon: Sun },
    { id: 'curve', label: 'Measure', icon: Activity },
    { id: 'result', label: 'Explain', icon: Bot },
] as const

const STEP_MS = 3800
// iPhone 15 Pro mockup (393×852 screen), shown at 70%.
const PHONE_SCALE = 0.7
const CONTENT_ZOOM = 393 / 270

export function AppTeaser() {
    const [step, setStep] = useState(0)
    const [paused, setPaused] = useState(false)
    const [tilt, setTilt] = useState({ x: 0, y: 0 })
    const wrapRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
        const id = window.setInterval(() => setStep((s) => (s + 1) % steps.length), STEP_MS)
        return () => window.clearInterval(id)
    }, [paused])

    const onMove = (e: React.PointerEvent) => {
        const r = wrapRef.current?.getBoundingClientRect()
        if (!r) return
        setTilt({ x: ((e.clientY - r.top) / r.height - 0.5) * -10, y: ((e.clientX - r.left) / r.width - 0.5) * 12 })
    }

    return (
        <div className="flex flex-col items-center">
            <div
                ref={wrapRef}
                onPointerMove={onMove}
                onPointerEnter={() => setPaused(true)}
                onPointerLeave={() => {
                    setPaused(false)
                    setTilt({ x: 0, y: 0 })
                }}
                className="relative [perspective:1200px]">
                {/* glow */}
                <div aria-hidden className="absolute inset-x-6 bottom-0 top-10 rounded-[3rem] bg-foreground/20 blur-3xl" />

                <div
                    className="relative transition-transform duration-300 ease-out motion-safe:animate-[teaser-float_6s_ease-in-out_infinite]"
                    style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}>
                    {/* phone: the mockup is drawn at real iPhone size and zoomed down (zoom, unlike its
                        `scale` transform, also shrinks the space it takes up, so nothing overflows) */}
                    <div className="flex">
                        <IPhoneMockup
                            model="15-pro"
                            color="space-black"
                            safeArea={false}
                            shadow="0 40px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.08)"
                            style={{ zoom: PHONE_SCALE }}>
                            {/* Screens are laid out at 270px wide and zoomed to fill the 393px screen. */}
                            <div className="relative overflow-hidden text-white" style={{ width: 270, height: 852 / CONTENT_ZOOM, zoom: CONTENT_ZOOM }}>
                                <StatusBar />
                                <Screen active={step === 0}>
                                    <AlignScreen />
                                </Screen>
                                <Screen active={step === 1}>
                                    <FlashScreen active={step === 1} />
                                </Screen>
                                <Screen active={step === 2}>
                                    <CurveScreen active={step === 2} />
                                </Screen>
                                <Screen active={step === 3}>
                                    <ResultScreen />
                                </Screen>
                            </div>
                        </IPhoneMockup>
                    </div>

                    <span className="absolute -right-4 top-10 z-30 rotate-6 rounded-full border bg-background px-3 py-1 text-xs font-semibold text-foreground shadow-lg">
                        Preview · coming soon
                    </span>
                </div>
            </div>

            {/* step picker */}
            <div className="mt-8 flex items-center gap-1 rounded-full border bg-background/70 p-1 backdrop-blur" role="tablist" aria-label="Preview steps">
                {steps.map((s, i) => {
                    const Icon = s.icon
                    return (
                        <button
                            key={s.id}
                            role="tab"
                            aria-selected={step === i}
                            onClick={() => {
                                setStep(i)
                                setPaused(true)
                            }}
                            className={cn(
                                'relative flex items-center gap-1.5 overflow-hidden rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                                step === i ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
                            )}>
                            <Icon className="size-3.5" />
                            {s.label}
                            {step === i && !paused && (
                                <span
                                    key={`${i}-${step}`}
                                    className="absolute bottom-0 left-0 h-0.5 bg-background/70 motion-safe:animate-[teaser-progress_linear_forwards]"
                                    style={{ animationDuration: `${STEP_MS}ms` }}
                                />
                            )}
                        </button>
                    )
                })}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Concept preview with example data. The final app may look different.</p>
        </div>
    )
}

function StatusBar() {
    return (
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 pt-3 text-[10px] font-semibold text-white/80">
            <span>9:41</span>
            <span className="flex items-center gap-1">
                <span className="h-2 w-3 rounded-[2px] border border-white/70" />
            </span>
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

function Eye({ pupil = 0.42, className }: { pupil?: number; className?: string }) {
    return (
        <svg viewBox="0 0 120 60" className={className} aria-hidden>
            <path d="M6 30 C 30 4, 90 4, 114 30 C 90 56, 30 56, 6 30 Z" fill="white" opacity="0.92" />
            <circle cx="60" cy="30" r="19" fill="#6b6b6b" />
            <circle cx="60" cy="30" r="19" fill="url(#irisRings)" />
            <circle cx="60" cy="30" r={19 * pupil} fill="#050505" style={{ transition: 'r 0.35s ease-out' }} />
            <circle cx="66" cy="23" r="3.2" fill="white" opacity="0.9" />
            <circle cx="60" cy="30" r="23.5" fill="none" stroke="white" strokeOpacity="0.85" strokeWidth="1.5" strokeDasharray="3 3" />
            <defs>
                <radialGradient id="irisRings">
                    <stop offset="0.35" stopColor="#2a2a2a" />
                    <stop offset="0.55" stopColor="#a3a3a3" />
                    <stop offset="0.85" stopColor="#5a5a5a" />
                    <stop offset="1" stopColor="#111" />
                </radialGradient>
            </defs>
        </svg>
    )
}

function AlignScreen() {
    return (
        <div className="flex h-full flex-col bg-[radial-gradient(ellipse_at_top,#3a3a3a,#0a0a0a_70%)] px-5 pb-8 pt-12">
            <p className="text-center text-[11px] uppercase tracking-widest text-white/60">Step 1</p>
            <p className="mt-1 text-center text-lg font-semibold">Line up your eyes</p>
            <div className="relative mx-auto mt-6 flex h-64 w-48 items-center justify-center rounded-[50%] border-2 border-dashed border-white/40">
                <div className="flex gap-3">
                    <Eye className="w-[4.5rem] motion-safe:animate-[teaser-scan_2.4s_ease-in-out_infinite]" />
                    <Eye className="w-[4.5rem] motion-safe:animate-[teaser-scan_2.4s_ease-in-out_infinite]" />
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
            <div className="mt-auto rounded-full bg-white py-2.5 text-center text-sm font-semibold text-black">Start test</div>
        </div>
    )
}

function FlashScreen({ active }: { active: boolean }) {
    return (
        <div className={cn('flex h-full flex-col items-center justify-center bg-black', active && 'motion-safe:animate-[teaser-flash_3.8s_ease-out_forwards]')}>
            <div className="relative flex size-32 items-center justify-center">
                <span className="absolute inset-0 rounded-full border border-white/30 motion-safe:animate-ping" />
                <span className="size-3 rounded-full bg-white" />
            </div>
            <p className="mt-10 text-sm font-medium text-white/80 mix-blend-difference">Keep your eyes on the dot</p>
            <p className="mt-1 text-xs text-white/50 mix-blend-difference">The screen flashes once</p>
        </div>
    )
}

function CurveScreen({ active }: { active: boolean }) {
    // Example light-reflex curve: flat, flash, quick dip, slow recovery.
    const d = 'M8 40 L70 40 L82 41 C 92 44, 98 96, 120 100 C 150 104, 175 70, 200 58 C 225 48, 250 44, 272 42'
    return (
        <div className="flex h-full flex-col px-5 pb-8 pt-12">
            <p className="text-center text-[11px] uppercase tracking-widest text-white/60">Step 3</p>
            <p className="mt-1 text-center text-lg font-semibold">Your light reflex</p>
            <div className="mt-5 rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10">
                <svg viewBox="0 0 280 120" className="w-full" aria-hidden>
                    <rect x="70" y="8" width="26" height="104" fill="white" opacity="0.1" />
                    <text x="83" y="20" textAnchor="middle" fontSize="8" fill="white" opacity="0.6">
                        flash
                    </text>
                    {[30, 60, 90].map((y) => (
                        <line key={y} x1="8" x2="272" y1={y} y2={y} stroke="white" strokeOpacity="0.08" />
                    ))}
                    <path
                        d={d}
                        fill="none"
                        stroke="white"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        pathLength={1}
                        strokeDasharray="1"
                        strokeDashoffset={active ? 0 : 1}
                        style={{ transition: active ? 'stroke-dashoffset 1.8s ease-out 0.3s' : 'none' }}
                    />
                </svg>
                <p className="mt-1 text-[10px] text-white/50">pupil size over 7 seconds</p>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                    { v: '27%', l: 'shrink' },
                    { v: '0.30s', l: 'reaction' },
                    { v: '2.9', l: 'mm/s' },
                ].map((m, i) => (
                    <div
                        key={m.l}
                        className="rounded-xl bg-white/[0.06] px-1 py-2.5 ring-1 ring-white/10 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95"
                        style={{ animationDelay: `${900 + i * 200}ms`, animationFillMode: 'both' }}>
                        <div className="text-base font-semibold">{m.v}</div>
                        <div className="text-[10px] text-white/50">{m.l}</div>
                    </div>
                ))}
            </div>
            <div
                className="mt-3 rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10 motion-safe:animate-in motion-safe:fade-in"
                style={{ animationDelay: '1500ms', animationFillMode: 'both' }}>
                <div className="flex justify-between text-[10px] text-white/60">
                    <span>Compared with published studies</span>
                    <span className="font-semibold text-white">Typical</span>
                </div>
                <div className="relative mt-2.5 h-1.5 rounded-full bg-gradient-to-r from-white/15 to-white/70">
                    <span
                        className="absolute -top-1 size-3.5 -translate-x-1/2 rounded-full border-2 border-black bg-white transition-[left] duration-1000 ease-out"
                        style={{ left: active ? '72%' : '10%', transitionDelay: active ? '1.4s' : '0s' }}
                    />
                </div>
                <div className="mt-1.5 flex justify-between text-[9px] text-white/40">
                    <span>slower</span>
                    <span>faster</span>
                </div>
            </div>
            <p className="mt-auto text-center text-[10px] text-white/40">Example data</p>
        </div>
    )
}

function ResultScreen() {
    return (
        <div className="flex h-full flex-col px-5 pb-8 pt-12">
            <p className="text-center text-[11px] uppercase tracking-widest text-white/60">Step 4</p>
            <p className="mt-1 text-center text-lg font-semibold">What it means</p>
            <div className="mt-5 rounded-2xl bg-white p-4 text-black">
                <div className="flex items-center gap-2 text-sm font-semibold">
                    <CheckCircle2 className="size-4" /> Response looks typical
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-black/70">Your pupil reacted in the range we expect. This isn&apos;t a diagnosis and doesn&apos;t rule out diabetes.</p>
            </div>
            <div className="mt-2.5 rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10">
                <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-white/80">
                        <Eye pupil={0.4} className="w-6" /> Left vs right
                    </span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-black">Even</span>
                </div>
                {[
                    { eye: 'Left eye lit', v: 92 },
                    { eye: 'Right eye lit', v: 88 },
                ].map((r) => (
                    <div key={r.eye} className="mt-2 flex items-center gap-2 text-[10px] text-white/60">
                        <span className="w-[4.5rem]">{r.eye}</span>
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                            <span className="block h-full rounded-full bg-white/80" style={{ width: `${r.v}%` }} />
                        </span>
                    </div>
                ))}
            </div>
            <div className="mt-3 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
                <div className="flex items-center gap-2 text-xs font-semibold text-white/80">
                    <Bot className="size-3.5" /> AI explanation
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-white/70">
                    Your pupil shrank quickly after the flash and relaxed normally. Lighting, tiredness and caffeine can all change pupils, so
                    try again another day to compare
                    <span className="ml-0.5 inline-block h-3 w-1 translate-y-0.5 bg-white/70 motion-safe:animate-pulse" />
                </p>
            </div>
            <div className="mt-auto grid grid-cols-2 gap-2 text-center text-xs font-semibold">
                <div className="rounded-full bg-white/10 py-2.5">Save</div>
                <div className="rounded-full bg-white py-2.5 text-black">Scan again</div>
            </div>
        </div>
    )
}
