import type { Metadata } from "next";
import { ExternalLink, Eye, FlaskConical, Gauge, Smartphone } from "lucide-react";
import { SiteNav } from "@/components/blocks/site-nav";
import { SiteFooter } from "@/components/blocks/site-footer";
import { Reveal } from "@/components/motion/reveal";
import { PUBLISHED_PUPIL_IRIS_RATIO, STUDIES } from "@/lib/reference";

export const metadata: Metadata = {
  title: "Research · Iris",
  description: "The research and limits behind Iris's three planned checks: diabetes-related pupil responses, glaucoma-related eye differences, and cataract-related cloudiness.",
};

const checks = [
  {
    title: "Diabetes",
    measurement: "Pupil response to light",
    body: "Specialized pupil devices have found average differences between people with and without diabetes. Iris is investigating whether an ordinary phone can capture useful measurements; the groups overlap and blood tests are still needed for diagnosis.",
    href: "https://pubmed.ncbi.nlm.nih.gov/35616273/",
    link: "Read the pupil study",
  },
  {
    title: "Glaucoma",
    measurement: "Comparing the two eyes",
    body: "Small studies have explored phone pupillometry in glaucoma. Iris plans to compare responses when each eye is lit separately. Uneven responses can have several causes, while early disease or similar damage in both eyes may be missed. An eye exam is needed.",
    href: "https://www.frontiersin.org/journals/neurology/articles/10.3389/fneur.2024.1426205/full",
    link: "Read the phone pupil study",
  },
  {
    title: "Cataracts",
    measurement: "Looking for lens cloudiness",
    body: "A cataract is a cloudy area in the eye's lens. Iris plans to explore visible haze in images captured during the scan. Lighting and glare can mimic cloudiness, and early cataracts may be missed. The phone method needs its own testing against eye exams.",
    href: "https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/cataracts",
    link: "Learn about cataracts at NEI",
  },
];

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
    body: "Iris is exploring all three checks using an ordinary phone camera and screen, without a separate lens or clinic device.",
  },
  {
    icon: Gauge,
    title: "Three kinds of measurements",
    body: "Pupil response for diabetes research, separate-eye response balance for glaucoma research, and captured images for cataract-related cloudiness.",
  },
  {
    icon: Eye,
    title: "Left vs right check",
    body: "Each eye needs to be lit on its own while the other is covered. A single flash on both eyes cannot isolate a difference in the signal from each eye. This part of the capture flow still needs development.",
  },
  {
    icon: FlaskConical,
    title: "Tested before launch",
    body: "Each check needs independent evaluation: blood-test-confirmed diabetes status, clinical pupil assessments for the eye comparison, and eye exams for lens cloudiness. Prototype results can't rule out disease.",
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
              Iris is exploring three areas: diabetes-related pupil responses, glaucoma-related differences between eyes, and cataract-related
              lens cloudiness. They use different signals, have different evidence, and each needs its own testing.
            </p>
            <p className="mt-4 max-w-2xl rounded-2xl border bg-muted/40 p-4 text-sm text-muted-foreground">
              <strong className="text-foreground">Still research:</strong> Iris hasn&apos;t established clinical accuracy for any of the three
              checks. Published findings don&apos;t establish how our phone version will perform. A typical measurement cannot rule out disease;
              diabetes needs blood testing, and glaucoma or cataracts need an eye exam.
            </p>
          </Reveal>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {checks.map((check, i) => (
              <Reveal key={check.title} delay={i * 120}>
                <div className="flex h-full flex-col rounded-2xl border bg-card p-6">
                  <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Planned check {i + 1}</p>
                  <h2 className="mt-3 text-xl font-semibold">{check.title}</h2>
                  <p className="mt-1 text-sm font-medium">{check.measurement}</p>
                  <p className="mb-5 mt-3 text-sm leading-relaxed text-muted-foreground">{check.body}</p>
                  <a href={check.href} target="_blank" rel="noreferrer" className="mt-auto inline-flex items-center gap-2 text-sm font-medium underline underline-offset-4">
                    {check.link} <ExternalLink aria-hidden="true" className="size-3.5 shrink-0" />
                  </a>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-16">
            <h2 className="text-2xl font-bold md:text-3xl">Diabetes: the pupil research</h2>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">The figures below describe published studies and population data. They are not accuracy results for Iris.</p>
          </Reveal>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
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
