"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

/**
 * Famous quotes about what Iris is building: catching problems early, the eye,
 * and technology that feels like magic. Adapted from the minimal-testimonial block.
 * Portraits are public-domain images from Wikimedia Commons, cropped to headshots:
 * Franklin by Joseph Siffred Duplessis (c. 1785), Leonardo's red-chalk self-portrait
 * (c. 1512), and a photo of Arthur C. Clarke released into the public domain.
 */
const quotes = [
  {
    quote: "An ounce of prevention is worth a pound of cure.",
    name: "Benjamin Franklin",
    role: "Inventor and Founding Father, 1735",
    image: "/quotes/franklin.jpg",
  },
  {
    quote:
      "The eye, which is termed the window of the soul, is the chief organ whereby the understanding can have the most complete and magnificent view of the infinite works of nature.",
    name: "Leonardo da Vinci",
    role: "Artist and scientist, from his notebooks (translated)",
    image: "/quotes/leonardo.jpg",
  },
  {
    quote: "Any sufficiently advanced technology is indistinguishable from magic.",
    name: "Arthur C. Clarke",
    role: "Science-fiction writer and futurist, Profiles of the Future",
    image: "/quotes/clarke.jpg",
  },
]

export function TestimonialsMinimal() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  // Gently cycle through the quotes unless the visitor is hovering or has chosen one.
  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const id = window.setInterval(() => setActive((a) => (a + 1) % quotes.length), 7000)
    return () => window.clearInterval(id)
  }, [paused])

  return (
    <div
      className="mx-auto w-full max-w-2xl px-6 py-16"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}>
      {/* Quote */}
      <div className="relative mb-12 min-h-[11rem] sm:min-h-[8.5rem]" aria-live="polite">
        {quotes.map((t, i) => (
          <blockquote
            key={t.name}
            aria-hidden={active !== i}
            className={cn(
              "absolute inset-0 text-xl font-light leading-relaxed text-foreground transition-all duration-500 ease-out md:text-2xl",
              active === i ? "translate-y-0 opacity-100 blur-0" : "pointer-events-none translate-y-4 opacity-0 blur-sm",
            )}>
            &ldquo;{t.quote}&rdquo;
          </blockquote>
        ))}
      </div>

      {/* Author Row */}
      <div className="flex items-center gap-6">
        {/* Avatars */}
        <div className="flex -space-x-2">
          {quotes.map((t, i) => (
            <button
              key={t.name}
              onClick={() => {
                setActive(i)
                setPaused(true)
              }}
              aria-label={`Show quote by ${t.name}`}
              aria-pressed={active === i}
              className={cn(
                "relative h-10 w-10 overflow-hidden rounded-full bg-muted ring-2 ring-background transition-all duration-300 ease-out",
                active === i ? "z-10 scale-110" : "hover:z-10 hover:scale-105",
              )}>
              <Image
                src={t.image}
                alt=""
                width={80}
                height={80}
                className={cn(
                  "h-full w-full object-cover transition-[filter] duration-300",
                  active === i ? "grayscale-0" : "grayscale hover:grayscale-0",
                )}
              />
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-border" />

        {/* Active Author Info */}
        <div className="relative min-h-[44px] flex-1">
          {quotes.map((t, i) => (
            <div
              key={t.name}
              aria-hidden={active !== i}
              className={cn(
                "absolute inset-0 flex flex-col justify-center transition-all duration-500 ease-out",
                active === i ? "translate-x-0 opacity-100" : "pointer-events-none -translate-x-2 opacity-0",
              )}>
              <span className="text-sm font-medium text-foreground">{t.name}</span>
              <span className="text-xs text-muted-foreground">{t.role}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
