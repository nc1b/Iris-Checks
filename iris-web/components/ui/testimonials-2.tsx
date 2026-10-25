"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Quote } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

const quotes = [
  {
    quote: "An ounce of prevention is worth a pound of cure.",
    name: "Benjamin Franklin",
    role: "Inventor and Founding Father",
    source: "1735",
    initials: "BF",
    avatar: "/quotes/franklin.jpg",
  },
  {
    quote: "The eye, which is termed the window of the soul, is the chief organ whereby the understanding can have the most complete and magnificent view of the infinite works of nature.",
    name: "Leonardo da Vinci",
    role: "Artist and scientist",
    source: "Notebooks, translated",
    initials: "LV",
    avatar: "/quotes/leonardo.jpg",
  },
  {
    quote: "Any sufficiently advanced technology is indistinguishable from magic.",
    name: "Arthur C. Clarke",
    role: "Writer and futurist",
    source: "Profiles of the Future",
    initials: "AC",
    avatar: "/quotes/clarke.jpg",
  },
];

const context = [
  { value: "3", label: "planned checks" },
  { value: "Phone only", label: "hardware goal" },
  { value: "Research", label: "current stage" },
];

export default function TestimonialsBlock() {
  const [active, setActive] = useState(0);
  const quote = quotes[active];

  return (
    <section id="quotes" aria-labelledby="quotes-heading" className="w-full border-t bg-background px-6 py-24 text-foreground">
      <div className="mx-auto w-full max-w-3xl">
        <p className="text-center text-sm font-medium uppercase tracking-widest text-muted-foreground">Why it matters</p>
        <h2 id="quotes-heading" className="mb-10 mt-3 text-center text-3xl font-bold tracking-tight md:text-4xl">Ideas that guide Iris</h2>
        <div className="relative rounded-xl border border-border bg-card p-6 sm:p-10 lg:p-14">
          <div aria-hidden="true" className="absolute left-0 top-8 h-16 w-[3px] bg-foreground sm:top-10" />
          <Quote aria-hidden="true" className="mb-7 size-8 fill-current text-muted-foreground" />
          <div aria-live="polite" aria-atomic="true">
            <blockquote className="text-xl font-medium leading-[1.65] tracking-tight text-foreground sm:text-2xl">
              &ldquo;{quote.quote}&rdquo;
            </blockquote>
            <Separator className="my-8 sm:my-10" />
            <div className="flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <Avatar className="size-14 border border-border">
                  <AvatarImage src={quote.avatar} alt={quote.name} className="grayscale" />
                  <AvatarFallback className="text-sm font-semibold">{quote.initials}</AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-sm font-semibold leading-tight text-foreground">{quote.name}</span>
                  <span className="text-xs leading-relaxed text-muted-foreground">{quote.role}</span>
                  <span className="text-[11px] leading-relaxed text-muted-foreground">{quote.source}</span>
                </div>
              </div>
              <div aria-label="Iris project context" className="grid shrink-0 grid-cols-3 gap-4 border-t pt-6 sm:gap-5 sm:border-0 sm:pt-0">
                {context.map(item => (
                  <div key={item.label} className="flex flex-col items-center gap-1.5 text-center">
                    <span className="text-base font-bold leading-none tracking-tight text-foreground sm:text-lg">{item.value}</span>
                    <span className="text-[10px] leading-tight text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-center gap-5">
          <button type="button" aria-label="Previous quote" onClick={() => setActive(index => (index - 1 + quotes.length) % quotes.length)} className="flex size-11 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"><ArrowLeft aria-hidden="true" className="size-4" /></button>
          <p className="text-xs tabular-nums text-muted-foreground">{String(active + 1).padStart(2, "0")} <span className="mx-1 text-border">/</span> {String(quotes.length).padStart(2, "0")}</p>
          <button type="button" aria-label="Next quote" onClick={() => setActive(index => (index + 1) % quotes.length)} className="flex size-11 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"><ArrowRight aria-hidden="true" className="size-4" /></button>
        </div>
      </div>
    </section>
  );
}
