import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BlurRevealText } from "@/components/ui/blur-reveal";
import { FaqRoller, type FaqRollerRow } from "@/components/ui/faq-roller";
import { IRIS_FAQS } from "@/lib/faq";

const rows: FaqRollerRow[] = [
  { items: IRIS_FAQS.slice(0, 4), duration: 90, direction: "left" },
  { items: IRIS_FAQS.slice(4, 7), duration: 75, direction: "right" },
  { items: IRIS_FAQS.slice(7), duration: 85, direction: "left" },
];

export function FaqSection() {
  return (
    <section id="faq" aria-labelledby="faq-heading" className="scroll-mt-24 overflow-hidden border-t py-24">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">FAQ</p>
        <h2 id="faq-heading" className="mt-3 text-balance text-3xl font-bold tracking-tight md:text-5xl">
          <BlurRevealText text="Frequently asked questions" />
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
          The three planned checks, how one scan covers them, and what a result could and couldn&apos;t tell you. Hover a row, or use the button below, to pause.
        </p>
      </div>

      <FaqRoller rows={rows} className="mt-12" />

      <p className="mt-10 px-6 text-center text-sm text-muted-foreground">
        Still curious?{" "}
        <Link href="/research" className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-4 transition-opacity hover:opacity-70">
          Explore the research <ArrowUpRight aria-hidden className="size-3.5" />
        </Link>{" "}
        or ask the Iris assistant in the corner.
      </p>
    </section>
  );
}
