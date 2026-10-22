'use client'
import dynamic from 'next/dynamic'
import { MousePointer2, Zap } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Spotlight } from '@/components/ui/spotlight'
import { cn } from '@/lib/utils'

// WebGL only runs in the browser; show a soft placeholder while three.js loads.
const EyeScene = dynamic(() => import('@/components/blocks/eye-scene').then((m) => m.EyeScene), {
    ssr: false,
    loading: () => (
        <div className="flex h-full w-full items-center justify-center text-neutral-500">
            <span className="loader" />
        </div>
    ),
})

/**
 * "Meet Iris" showcase: the Spline-style card from the splite block, with a
 * code-built 3D eye instead of a Spline scene. Pressing Flash shows the exact
 * reflex Iris will measure.
 */
export function EyeShowcase() {
    const [flashSignal, setFlashSignal] = useState(0)
    const [flashing, setFlashing] = useState(false)
    const [pupil, setPupil] = useState(0.46)

    const flash = useCallback(() => {
        setFlashSignal((n) => n + 1)
        setFlashing(true)
        window.setTimeout(() => setFlashing(false), 180)
    }, [])

    const pct = Math.round(pupil * 100)

    return (
        <Card className="relative w-full overflow-hidden rounded-3xl border-neutral-800 bg-[#0a0a0a] text-neutral-50 md:h-[520px]">
            <Spotlight className="-top-40 left-0 md:-top-20 md:left-60" size={320} />

            {/* subtle grid */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
            />

            <div className="flex h-full flex-col md:flex-row">
                {/* Left content */}
                <div className="relative z-10 flex flex-col justify-center p-8 md:flex-1 md:p-12">
                    <span className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300">
                        <MousePointer2 className="size-3.5" /> Interactive
                    </span>
                    <h2 className="bg-gradient-to-b from-neutral-50 to-neutral-400 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
                        Meet the reflex
                        <br />
                        Iris will measure
                    </h2>
                    <p className="mt-4 max-w-md text-neutral-300">
                        Move your cursor and the eye follows you. Press flash and watch the pupil shrink a quarter of a second later, then slowly
                        relax. This reflex drives two of the three checks: how it reacts (diabetes) and whether both eyes react evenly (glaucoma).
                        The flash photo is used for the third (cataracts).
                    </p>

                    <div className="mt-8 flex flex-wrap items-center gap-4">
                        <button
                            onClick={flash}
                            className="group inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.03] active:scale-95">
                            <Zap className="size-4 transition-transform group-hover:rotate-12" /> Flash the light
                        </button>
                        <div className="min-w-[10rem]" aria-live="off">
                            <div className="flex items-center justify-between text-xs text-neutral-400">
                                <span>Pupil size</span>
                                <span className="font-mono text-neutral-200">{pct}%</span>
                            </div>
                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-800">
                                <div className="h-full rounded-full bg-white transition-[width] duration-100" style={{ width: `${(pct / 50) * 100}%` }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right content: the 3D eye */}
                <div className="relative h-[340px] cursor-pointer md:h-auto md:min-h-0 md:flex-1" onClick={flash} role="presentation">
                    <EyeScene className="absolute inset-0" flashSignal={flashSignal} onPupilChange={setPupil} />
                </div>
            </div>

            {/* The flash itself */}
            <div
                aria-hidden
                className={cn(
                    'pointer-events-none absolute inset-0 z-20 bg-white transition-opacity',
                    flashing ? 'opacity-80 duration-75' : 'opacity-0 duration-700',
                )}
            />
        </Card>
    )
}
