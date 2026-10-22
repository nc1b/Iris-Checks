import type { Metadata } from "next";
import { BookOpen, ExternalLink, Eye, FlaskConical, Gauge, Smartphone } from "lucide-react";
import { SiteNav } from "@/components/blocks/site-nav";
import { SiteFooter } from "@/components/blocks/site-footer";
import { Reveal } from "@/components/motion/reveal";
import { PUBLISHED_PUPIL_IRIS_RATIO, STUDIES } from "@/lib/reference";
import { ResearchLibrary } from "@/components/blocks/research-library";
import { ResearchMarkdown } from "@/components/blocks/research-markdown";
import notebook from "@/data/research-notebook.json";

export const metadata: Metadata = {
  title: "Research · Iris",
  description: "Explore the Iris research notebook: diabetes, glaucoma, cataracts, AI eye studies, the research timeline, datasets, prior art, methods, limitations, and collected source links.",
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
  { value: String(notebook.documents.length), label: "Research notes", source: "Studies, methods, datasets, and prior art" },
  { value: String(notebook.sources.length), label: "Collected source links", source: "Papers, projects, datasets, and background" },
  { value: "3", label: "Planned checks", source: "Diabetes, glaucoma, and cataracts" },
];

const noteSummaries = notebook.documents.map(note => ({
  id: note.id,
  title: note.title,
  category: note.category,
  description: note.description,
  archived: note.archived,
  updated: note.updated,
  searchText: note.searchText,
}));

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
              lens cloudiness. Our full notebook also covers the wider field of eye AI, its history, datasets, existing tools, and the open
              questions that shape what we build.
            </p>
            <a href="#library" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full border bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-80">
              <BookOpen aria-hidden="true" className="size-4" /> Browse all research
            </a>
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
            <h2 className="text-2xl font-bold md:text-3xl">The full research collection</h2>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">From the first retina models to phone-only measurements. Working notes and source leads, collected October 19–21, 2026.</p>
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

        <section id="library" aria-labelledby="library-heading" className="scroll-mt-24 border-t bg-muted/30">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <div className="mb-9 max-w-2xl">
              <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Research notebook</p>
              <h2 id="library-heading" className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">Follow the evidence</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">Search the complete notes, browse by topic, or go straight to a source. Open a note to read the study tables, methods, limitations, and references.</p>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Earlier directions are labelled. Unverified leads, preprints, conference abstracts, and patents should be read in that context. None of the published numbers are accuracy claims for Iris.</p>
            </div>
            <ResearchLibrary notes={noteSummaries} sources={notebook.sources} content={notebook.documents.map(note => <ResearchMarkdown key={note.id} content={note.markdown} />)} />
          </div>
        </section>

        <section className="border-t bg-muted/40">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <Reveal>
              <h2 className="text-2xl font-bold md:text-3xl">Resting pupil size in darkness</h2>
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
                Pupil size compared with iris size, from a 2010 pilot study. These are group averages measured in full darkness with infrared equipment. They do not define cutoffs for Iris.
              </p>
            </Reveal>
            <div className="mt-10 space-y-5">
              {ratios.map((r, i) => (
                <Reveal key={r.label} delay={i * 150} effect="left">
                  <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 sm:grid-cols-[11rem_1fr_3rem]">
                    <span className="text-sm">{r.label}</span>
                    <div className="col-span-2 row-start-2 h-3 overflow-hidden rounded-full bg-background ring-1 ring-border sm:col-span-1 sm:row-start-auto">
                      <div className="h-full rounded-full bg-foreground" style={{ width: `${(r.value / 0.6) * 100}%` }} />
                    </div>
                    <span className="col-start-2 row-start-1 text-right font-mono text-sm sm:col-start-3">{r.value.toFixed(2)}</span>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <Reveal>
              <h2 className="text-2xl font-bold md:text-3xl">Core pupil references</h2>
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
