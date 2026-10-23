"use client";

import { Pause, Play } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * FAQ roller (after dhileepkumargm's "habit-faq-scroller" on 21st.dev): rows of
 * question cards that loop sideways, alternating direction and speed.
 *
 * - Each row is rendered twice side by side and slid by -50%, so the loop is seamless.
 *   The second copy is hidden from screen readers and keyboard focus.
 * - It always moves (also when the device asks for reduced motion, by design), so there's
 *   a Pause button (WCAG 2.2.2), and hovering or focusing a row pauses it too.
 */

export type FaqRollerItem = { question: string; answer: string };
export type FaqRollerRow = { items: FaqRollerItem[]; duration?: number; direction?: "left" | "right" };

function FaqCard({ item }: { item: FaqRollerItem }) {
  return (
    <article className="flex w-[19rem] shrink-0 flex-col gap-3 rounded-2xl border bg-card p-6 text-card-foreground shadow-sm transition-colors hover:border-foreground/30 sm:w-[23rem]">
      <h3 className="text-base font-semibold leading-snug">{item.question}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
    </article>
  );
}

function Row({ row, paused }: { row: FaqRollerRow; paused: boolean }) {
  const reverse = row.direction === "right";
  return (
    <div className="group/row relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
      <div
        className={cn(
          "flex w-max items-stretch gap-4 py-2 group-hover/row:[animation-play-state:paused] group-focus-within/row:[animation-play-state:paused]",
          reverse ? "animate-[faq-scroll-reverse_var(--faq-duration)_linear_infinite]" : "animate-[faq-scroll_var(--faq-duration)_linear_infinite]",
          paused && "[animation-play-state:paused]",
        )}
        style={{ "--faq-duration": `${row.duration ?? 60}s` } as React.CSSProperties}
      >
        {/* Trailing gap keeps the spacing even where the two copies meet. */}
        <div className="flex items-stretch gap-4 pr-4">
          {row.items.map((item) => (
            <FaqCard key={item.question} item={item} />
          ))}
        </div>
        <div aria-hidden inert className="flex items-stretch gap-4 pr-4">
          {row.items.map((item) => (
            <FaqCard key={item.question} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function FaqRoller({ rows, className }: { rows: FaqRollerRow[]; className?: string }) {
  const [paused, setPaused] = useState(false);
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {rows.map((row, i) => (
        <Row key={i} row={row} paused={paused} />
      ))}
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-pressed={paused}
        className="mx-auto mt-2 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
        {paused ? "Play" : "Pause"} questions
      </button>
    </div>
  );
}
