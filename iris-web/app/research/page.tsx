import type { Metadata } from "next";
import { ExternalLink, Eye, FlaskConical, Gauge, Smartphone } from "lucide-react";
import { SiteNav } from "@/components/blocks/site-nav";
import { SiteFooter } from "@/components/blocks/site-footer";
import { Reveal } from "@/components/motion/reveal";
import { PUBLISHED_PUPIL_IRIS_RATIO, STUDIES } from "@/lib/reference";

export const metadata: Metadata = {
  title: "Research · Iris",
  description: "The published studies behind Iris: how the pupil's reaction to light changes with diabetes, and why a phone could measure it.",
};

const stats = [
  { value: "40M", label: "Americans have diabetes", source: "CDC, 2023 data" },
  { value: "11M", label: "of them don't know it yet", source: "CDC, 2023 data" },
  { value: "0.89", label: "AUC separating diabetes from healthy eyes with a handheld pupil device", source: "Singapore National Eye Centre, 2022" },
];

const ratios = [
  { label: "Healthy", value: PUBLISHED_PUPIL_IRIS_RATIO.healthy },
  { label: "Diabetes", value: PUBLISHED_PUPIL_IRIS_RATIO.diabetes },
  { label: "Diabetes + nerve damage", value: PUBLISHED_PUPIL_IRIS_RATIO.diabetesWithNeuropathy },
];

const plan = [
  {
    icon: Smartphone,
    title: "Phone only",
    body: "The studies used special pupillometers. Iris tests whether an ordinary phone camera and screen can measure the same reflex.",
  },
  {
    icon: Gauge,
    title: "Same measurements",
    body: "Resting pupil size, how much the pupil shrinks, how fast, and the delay before it reacts.",
  },
  {
    icon: Eye,
    title: "Left vs right check",
    body: "A second result compares your eyes: pupil size, and how each eye reacts when it's lit on its own (cover the other eye). An uneven reaction can point to optic-nerve problems such as glaucoma, so Iris suggests seeing an eye doctor.",
  },
  {
    icon: FlaskConical,
    title: "Tested before launch",
    body: "We'll compare readings from volunteers with and without diabetes before anyone relies on a result.",
  },
];

export default function ResearchPage() {
  return (
    <>
      <SiteNav />
      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-6 pb-16 pt-36">
          <Reveal>
            <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Research</p>
            <h1 className="mt-3 max-w-3xl text-balance text-4xl font-bold md:text-5xl">The science behind checking your eyes by phone</h1>
            <p className="mt-6 max-w-2xl text-muted-foreground">
              Your pupil is controlled by the same nerves that diabetes slowly damages. Researchers using special clinic devices found that,
              on average, the pupil&apos;s reaction to light is different in people with diabetes, sometimes before any eye damage is visible.
              Here&apos;s what they found.
            </p>
            <p className="mt-4 max-w-2xl rounded-2xl border bg-muted/40 p-4 text-sm text-muted-foreground">
              <strong className="text-foreground">What isn&apos;t known yet:</strong> these are differences between groups, and the groups
              overlap, so a pupil test can&apos;t give a definite yes or no for one person. No one has shown yet how well a phone version
              works. That&apos;s the question Iris is testing. Only a blood test (such as A1C or blood glucose) can diagnose diabetes.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {stats.map((s, i) => (
              <Reveal key={s.label} delay={i * 120} effect="zoom">
                <div className="h-full rounded-2xl border bg-card p-6">
                  <div className="text-4xl font-bold tracking-tight">{s.value}</div>
                  <p className="mt-2 text-sm">{s.label}</p>
                  <p className="mt-3 text-xs text-muted-foreground">{s.source}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="border-t bg-muted/40">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <Reveal>
              <h2 className="text-2xl font-bold md:text-3xl">Resting pupil size in darkness</h2>
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
                Pupil size compared with iris size, from a 2010 pilot study. A smaller number means a smaller pupil. {PUBLISHED_PUPIL_IRIS_RATIO.note}
              </p>
            </Reveal>
            <div className="mt-10 space-y-5">
              {ratios.map((r, i) => (
                <Reveal key={r.label} delay={i * 150} effect="left">
                  <div className="flex items-center gap-4">
                    <span className="w-44 shrink-0 text-sm">{r.label}</span>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-background ring-1 ring-border">
                      <div className="h-full rounded-full bg-foreground" style={{ width: `${(r.value / 0.6) * 100}%` }} />
                    </div>
                    <span className="w-12 text-right font-mono text-sm">{r.value.toFixed(2)}</span>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <Reveal>
              <h2 className="text-2xl font-bold md:text-3xl">Published studies</h2>
            </Reveal>
            <ul className="mt-10 grid gap-4 md:grid-cols-2">
              {STUDIES.map((s, i) => (
                <Reveal key={s.id} as="li" delay={(i % 2) * 120}>
                  <div className="group h-full rounded-2xl border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-white/5">
                    <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-start gap-2 font-semibold hover:underline">
                      {s.title}
                      <ExternalLink className="mt-1 size-3.5 shrink-0" />
                    </a>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {s.journal}
                      {s.year ? ` · ${s.year}` : ""}
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground">{s.finding}</p>
                    <p className="mt-3 text-xs text-muted-foreground">Device: {s.device}</p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <Reveal>
              <h2 className="text-2xl font-bold md:text-3xl">How Iris will use this</h2>
            </Reveal>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {plan.map(({ icon: Icon, title, body }, i) => (
                <Reveal key={title} delay={i * 120}>
                  <div className="h-full rounded-2xl border bg-card p-6">
                    <Icon className="size-5" />
                    <h3 className="mt-4 font-semibold">{title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal className="mt-10">
              <p className="text-xs text-muted-foreground">
                To our knowledge, no one has published a phone-only version of this test for diabetes. Iris is a student research project, not a
                medical device.
              </p>
            </Reveal>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
