'use client'

import { Maximize2, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { HLSVideoPlayer } from '@/components/ui/hls-video-player'
import { cn } from '@/lib/utils'

/**
 * The 30-second trailer, playing muted and looped in the background of its own section, with an
 * "ambient light" glow that takes its colour from the video, and a "Watch with sound" button.
 *
 * Kind to phones and data: the video only loads when the section is near the screen, phones get
 * the 720p file, it pauses when scrolled away, and it doesn't play by itself for people who
 * asked for reduced motion or data saving (they get the poster and a play button).
 */

const SOURCES = { full: '/trailer/iris-trailer.mp4', small: '/trailer/iris-trailer-720.mp4' }
const POSTER = '/trailer/iris-trailer-poster.jpg'
/** The ambient glow is redrawn this many times a second from a tiny copy of the frame. */
const GLOW_FPS = 6
/**
 * The trailer opens on a few seconds of near-black screen, so the silent background version starts
 * here, on the first bright shot. "Watch with sound" still plays it from the very beginning.
 */
const BACKGROUND_START = 3

const time = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export function TrailerSection() {
    const sectionRef = useRef<HTMLElement>(null)
    const frameRef = useRef<HTMLDivElement>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const glowRef = useRef<HTMLCanvasElement>(null)
    // Chosen once on the client: which file, and whether it may start by itself.
    const [setup, setSetup] = useState<{ src: string; autoplay: boolean } | null>(null)
    const [playing, setPlaying] = useState(false)
    const [muted, setMuted] = useState(true)
    const [current, setCurrent] = useState(0)
    const [duration, setDuration] = useState(30)
    const userPaused = useRef(false)
    const visible = useRef(false)

    // Load the video only when the section comes near the screen.
    useEffect(() => {
        const section = sectionRef.current
        if (!section) return
        const io = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) return
                const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
                const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true
                const small = window.matchMedia('(max-width: 768px)').matches || saveData
                setSetup({ src: small ? SOURCES.small : SOURCES.full, autoplay: !reduced && !saveData })
                io.disconnect()
            },
            { rootMargin: '400px 0px' },
        )
        io.observe(section)
        return () => io.disconnect()
    }, [])

    // Play while on screen, pause when scrolled away (unless the person paused it themselves).
    useEffect(() => {
        const frame = frameRef.current
        if (!frame || !setup) return
        const io = new IntersectionObserver(
            ([entry]) => {
                visible.current = entry.isIntersecting
                const video = videoRef.current
                if (!video) return
                if (entry.isIntersecting && setup.autoplay && !userPaused.current) video.play().catch(() => {})
                else if (!entry.isIntersecting) video.pause()
            },
            { threshold: 0.25 },
        )
        io.observe(frame)
        return () => io.disconnect()
    }, [setup])

    // Ambient light: a tiny, blurred copy of the current frame glows behind the player.
    useEffect(() => {
        if (!playing) return
        const video = videoRef.current
        const canvas = glowRef.current
        const ctx = canvas?.getContext('2d')
        if (!video || !canvas || !ctx) return
        const id = window.setInterval(() => {
            if (video.readyState >= 2) ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        }, 1000 / GLOW_FPS)
        return () => window.clearInterval(id)
    }, [playing])

    const togglePlay = useCallback(() => {
        const video = videoRef.current
        if (!video) return
        if (video.paused) {
            userPaused.current = false
            video.play().catch(() => {})
        } else {
            userPaused.current = true
            video.pause()
        }
    }, [])

    const toggleSound = useCallback(() => {
        const video = videoRef.current
        if (!video) return
        if (video.muted) {
            // Turning the sound on starts the trailer from the beginning, the way it was made to be heard.
            video.muted = false
            video.currentTime = 0
            userPaused.current = false
            video.play().catch(() => {})
        } else {
            video.muted = true
        }
        setMuted(video.muted)
    }, [])

    const fullscreen = useCallback(() => {
        const video = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null
        if (!video) return
        if (video.requestFullscreen) video.requestFullscreen().catch(() => {})
        else video.webkitEnterFullscreen?.() // iPhone Safari
    }, [])

    const seek = (e: React.PointerEvent<HTMLDivElement>) => {
        const video = videoRef.current
        if (!video || !duration) return
        const box = e.currentTarget.getBoundingClientRect()
        video.currentTime = Math.min(duration, Math.max(0, ((e.clientX - box.left) / box.width) * duration))
    }

    return (
        <section ref={sectionRef} id="trailer" aria-labelledby="trailer-title" className="relative scroll-mt-24 overflow-hidden border-t">
            <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
                <div className="max-w-xl">
                    <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Trailer</p>
                    <h2 id="trailer-title" className="mt-3 text-balance text-3xl font-bold md:text-5xl">
                        See what Iris can do
                    </h2>
                </div>

                <div className="relative mt-10 md:mt-12">
                    {/* Ambient light from the video itself, softly spilling around the frame. */}
                    <canvas
                        ref={glowRef}
                        width={32}
                        height={18}
                        aria-hidden
                        className={cn(
                            // On a white page a mostly dark video would glow grey, so it stays faint in light mode.
                            'pointer-events-none absolute -inset-x-[5%] -inset-y-[5%] h-[110%] w-[110%] blur-3xl transition-opacity duration-1000',
                            playing ? 'opacity-15 dark:opacity-40' : 'opacity-0',
                        )}
                    />

                    <div
                        ref={frameRef}
                        className="group relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-black shadow-2xl shadow-black/20 ring-1 dark:shadow-black/40 ring-black/5 dark:ring-white/5"
                    >
                        {setup ? (
                            <HLSVideoPlayer
                                ref={videoRef}
                                src={setup.src}
                                poster={POSTER}
                                width={1920}
                                height={1080}
                                muted
                                loop
                                playsInline
                                preload="auto"
                                aria-label="Iris trailer, 30 seconds"
                                className="block h-auto w-full"
                                onPlay={() => setPlaying(true)}
                                onPause={() => setPlaying(false)}
                                onLoadedMetadata={(e) => {
                                    setDuration(e.currentTarget.duration || 30)
                                    if (setup.autoplay && e.currentTarget.currentTime < 1) e.currentTarget.currentTime = BACKGROUND_START
                                }}
                                onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
                                onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
                                onReady={() => {
                                    if (setup.autoplay && visible.current && !userPaused.current) videoRef.current?.play().catch(() => {})
                                }}
                            />
                        ) : (
                            // eslint-disable-next-line @next/next/no-img-element -- a placeholder the same size as the video until it loads
                            <img src={POSTER} alt="" width={1920} height={1080} className="block aspect-video h-auto w-full" />
                        )}

                        {/* Shade at the bottom so the controls read on any frame. */}
                        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                        {/* Big play button when it isn't playing (paused, or not allowed to start by itself). */}
                        {!playing && (
                            <button
                                type="button"
                                onClick={togglePlay}
                                aria-label="Play the trailer"
                                className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black shadow-xl backdrop-blur transition hover:scale-105 hover:bg-white md:size-20"
                            >
                                <Play className="ml-1 size-7 md:size-8" />
                            </button>
                        )}

                        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 p-3 md:gap-3 md:p-5">
                            <button
                                type="button"
                                onClick={togglePlay}
                                aria-label={playing ? 'Pause the trailer' : 'Play the trailer'}
                                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/20 backdrop-blur-md transition hover:bg-white/25"
                            >
                                {playing ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
                            </button>
                            <button
                                type="button"
                                onClick={toggleSound}
                                aria-pressed={!muted}
                                className={cn(
                                    'flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium ring-1 backdrop-blur-md transition',
                                    muted ? 'bg-white text-black ring-white hover:bg-white/90' : 'bg-white/15 text-white ring-white/20 hover:bg-white/25',
                                )}
                            >
                                {muted ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
                                {muted ? 'Watch with sound' : 'Mute'}
                            </button>

                            <span className="ml-auto hidden text-xs tabular-nums text-white/80 sm:block">
                                {time(current)} / {time(duration)}
                            </span>
                            <button
                                type="button"
                                onClick={fullscreen}
                                aria-label="Full screen"
                                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/20 backdrop-blur-md transition hover:bg-white/25 max-sm:ml-auto"
                            >
                                <Maximize2 className="size-4" />
                            </button>
                        </div>

                        {/* Progress: a thin line along the bottom edge; click it to jump. */}
                        <div
                            role="slider"
                            aria-label="Trailer progress"
                            aria-valuemin={0}
                            aria-valuemax={Math.round(duration)}
                            aria-valuenow={Math.round(current)}
                            tabIndex={-1}
                            onPointerDown={seek}
                            className="absolute inset-x-0 bottom-0 h-1.5 cursor-pointer bg-white/10"
                        >
                            <div className="h-full bg-white/80 transition-[width] duration-200 ease-linear" style={{ width: `${(current / (duration || 30)) * 100}%` }} />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
