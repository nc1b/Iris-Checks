import { cn } from "@/lib/utils";

/**
 * FAQ roller (after dhileepkumargm's "habit-faq-scroller" on 21st.dev): rows of
 * question cards that loop sideways, alternating direction and speed.
 *
 * - Each row is rendered twice side by side and slid by -50%, so the loop is seamless.
 *   The second copy is hidden from screen readers and keyboard focus.
 * - Hovering or focusing a row pauses it so the answer can be read.
 * - With "reduce motion" on, rows don't move and can be scrolled sideways instead.
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

function Row({ row }: { row: FaqRollerRow }) {
  const reverse = row.direction === "right";
  return (
    <div className="group/row faq-row relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)] motion-reduce:overflow-x-auto motion-reduce:[mask-image:none]">
      <div
        className={cn(
          "flex w-max items-stretch gap-4 py-2 group-hover/row:[animation-play-state:paused] group-focus-within/row:[animation-play-state:paused] motion-reduce:animate-none",
          reverse ? "animate-[faq-scroll-reverse_var(--faq-duration)_linear_infinite]" : "animate-[faq-scroll_var(--faq-duration)_linear_infinite]",
        )}
        style={{ "--faq-duration": `${row.duration ?? 60}s` } as React.CSSProperties}
      >
        {/* Trailing gap keeps the spacing even where the two copies meet. */}
        <div className="flex items-stretch gap-4 pr-4 motion-reduce:pr-0">
          {row.items.map((item) => (
            <FaqCard key={item.question} item={item} />
          ))}
        </div>
        <div aria-hidden inert className="flex items-stretch gap-4 pr-4 motion-reduce:hidden">
          {row.items.map((item) => (
            <FaqCard key={item.question} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function FaqRoller({ rows, className }: { rows: FaqRollerRow[]; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {rows.map((row, i) => (
        <Row key={i} row={row} />
      ))}
    </div>
  );
}
