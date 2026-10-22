import { Check } from "lucide-react";
import { BlurRevealText } from "@/components/ui/blur-reveal";
import { Timeline, type TimelineEntry } from "@/components/ui/timeline";
import { ROADMAP, type RoadmapStatus } from "@/lib/roadmap";
import { cn } from "@/lib/utils";

function StatusBadge({ status }: { status: RoadmapStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        status === "Now" ? "border-foreground bg-foreground text-background" : status === "Next" ? "border-foreground/40" : "text-muted-foreground",
      )}
    >
      {status === "Now" && <span className="size-1.5 animate-pulse rounded-full bg-background motion-reduce:animate-none" />}
      {status}
    </span>
  );
}

const entries: TimelineEntry[] = ROADMAP.map((r) => ({
  title: r.title,
  label: <StatusBadge status={r.status} />,
  content: (
    <div className="rounded-2xl border bg-card p-6 shadow-sm">
      <h4 className="text-lg font-semibold">{r.heading}</h4>
      <p className="mt-1.5 text-sm text-muted-foreground">{r.body}</p>
      <ul className="mt-4 space-y-2">
        {r.items.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-sm">
            <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border">
              <Check className="size-2.5" />
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  ),
}));

export function RoadmapSection() {
  return (
    <section id="roadmap" className="scroll-mt-24 border-t">
      <Timeline
        data={entries}
        heading={
          <>
            <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Roadmap</p>
            <h2 className="mt-3 max-w-2xl text-balance text-3xl font-bold md:text-5xl">
              <BlurRevealText text="What we're building, and when" />
            </h2>
          </>
        }
        intro={
          <p className="mt-4 max-w-xl text-muted-foreground">
            From research to a free app, one careful step at a time. Dates are goals and may change as we learn.
          </p>
        }
      />
    </section>
  );
}
