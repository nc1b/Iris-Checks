import { Activity, BrainCircuit, Camera, FileText, Lock, ScanEye, Smartphone, Sparkles, Zap } from "lucide-react";
import ResponsiveHeroBanner from "@/components/ui/responsive-hero-banner";
import { STUDIES } from "@/lib/reference";

const steps = [
  {
    icon: <Camera className="h-5 w-5" />,
    title: "1. Line up your eyes",
    body: "Open Iris on your phone in a dim room. Google's MediaPipe face model finds both irises in real time, right on your device.",
  },
  {
    icon: <Zap className="h-5 w-5" />,
    title: "2. One flash of light",
    body: "The screen flashes for one second. The camera records how far and how fast your pupils shrink, frame by frame.",
  },
  {
    icon: <Activity className="h-5 w-5" />,
    title: "3. Measure the reflex",
    body: "Iris turns the video into a light-reflex curve: resting size, how much the pupil shrinks, reaction delay and speed.",
  },
  {
    icon: <BrainCircuit className="h-5 w-5" />,
    title: "4. Compare and explain",
    body: "Your curve is compared with published pupil studies in diabetes. An AI model then explains the result in plain language.",
  },
];

export default function Home() {
  return (
    <main className="flex-1">
      <ResponsiveHeroBanner
        badgeLabel="Prototype"
        badgeText="Samsung Solve for Tomorrow 2026–27"
        title="Your eyes know"
        titleLine2="before you do"
        description="About 11 million Americans have diabetes and don't know it. Diabetes quietly damages the nerves that control your pupil. Iris uses only your phone's camera and screen to measure that reflex in 10 seconds."
        primaryButtonText="Start eye scan"
        primaryButtonHref="/scan"
        secondaryButtonText="Try a demo"
        secondaryButtonHref="/scan?demo=1"
        ctaButtonText="Start scan"
        ctaButtonHref="/scan"
        partnersTitle="Built on published research"
        partners={STUDIES.map((s) => ({ label: s.short, href: s.url }))}
      />

      <section id="how" className="mx-auto max-w-6xl px-6 py-24">
        <p className="text-sm font-semibold uppercase tracking-widest text-iris-300">How it works</p>
        <h2 className="mt-3 max-w-2xl font-instrument-serif text-4xl text-iris-50 sm:text-5xl">A pupil test that fits in your pocket</h2>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.title} className="rounded-3xl bg-white/[0.03] p-6 ring-1 ring-white/10">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-iris-400/15 text-iris-300">{s.icon}</div>
              <h3 className="mt-4 font-medium text-iris-50">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-iris-100/70">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="science" className="border-y border-white/5 bg-iris-900/20">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-iris-300">The science</p>
            <h2 className="mt-3 font-instrument-serif text-4xl text-iris-50 sm:text-5xl">Proven with clinic devices. Untested on phones, until now.</h2>
            <p className="mt-6 leading-relaxed text-iris-100/75">
              Your pupil is controlled by the autonomic nervous system, the same nerves diabetes slowly damages. Studies with special pupillometers
              found that people with diabetes have smaller resting pupils and weaker, slower reactions to light, sometimes before any eye damage is
              visible.
            </p>
            <p className="mt-4 leading-relaxed text-iris-100/75">
              A 2022 study in Singapore told diabetes and healthy eyes apart with an AUC of 0.89 using a custom handheld device. Phone apps can already
              measure the pupil reflex for concussion. <strong className="text-iris-100">To our knowledge, no one has published a phone-only version
              tested for diabetes.</strong> Iris is our attempt.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3 text-center">
              {[
                { n: "40M", l: "Americans with diabetes" },
                { n: "11M", l: "don't know they have it" },
                { n: "0.89", l: "AUC with a clinic device" },
              ].map((s) => (
                <div key={s.l} className="rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/10">
                  <div className="font-instrument-serif text-3xl text-iris-300">{s.n}</div>
                  <div className="mt-1 text-xs text-iris-100/60">{s.l}</div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-iris-100/45">Diabetes figures: CDC National Diabetes Statistics Report (2023 data).</p>
          </div>
          <ul className="space-y-3">
            {STUDIES.map((s) => (
              <li key={s.id} className="rounded-3xl bg-white/[0.03] p-5 ring-1 ring-white/10">
                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 h-5 w-5 shrink-0 text-iris-300" />
                  <div>
                    <a href={s.url} target="_blank" rel="noreferrer" className="font-medium text-iris-100 hover:text-iris-50 hover:underline">
                      {s.title}
                    </a>
                    <p className="mt-1 text-xs text-iris-100/50">
                      {s.journal}
                      {s.year ? ` · ${s.year}` : ""}
                    </p>
                    <p className="mt-2 text-sm text-iris-100/75">{s.finding}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="privacy" className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: <Lock className="h-5 w-5" />,
              t: "Video stays on your phone",
              b: "Eye tracking and pupil measurement run in your browser. Camera frames are never uploaded or saved.",
            },
            {
              icon: <Sparkles className="h-5 w-5" />,
              t: "AI sees numbers, not faces",
              b: "Only the measurements (like '23% constriction') are sent to the AI model that writes your explanation.",
            },
            {
              icon: <Smartphone className="h-5 w-5" />,
              t: "No attachment needed",
              b: "Works with the selfie camera and screen of a normal phone. Designed for Samsung Galaxy phones.",
            },
          ].map((c) => (
            <div key={c.t} className="rounded-3xl bg-white/[0.03] p-6 ring-1 ring-white/10">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-iris-400/15 text-iris-300">{c.icon}</div>
              <h3 className="mt-4 font-medium text-iris-50">{c.t}</h3>
              <p className="mt-2 text-sm text-iris-100/70">{c.b}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-3xl bg-gradient-to-br from-iris-500/20 to-iris-900/20 p-8 text-center ring-1 ring-iris-400/25 sm:p-12">
          <ScanEye className="mx-auto h-10 w-10 text-iris-300" />
          <h2 className="mt-4 font-instrument-serif text-4xl text-iris-50">Ready to try it?</h2>
          <p className="mx-auto mt-3 max-w-xl text-iris-100/75">It takes about 10 seconds. Best on a phone, in a dim room, with brightness turned all the way up.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href="/scan" className="rounded-full bg-iris-300 px-6 py-3 text-sm font-medium text-iris-950 hover:bg-iris-200">
              Start eye scan
            </a>
            <a href="/scan?demo=1" className="rounded-full bg-white/10 px-6 py-3 text-sm font-medium text-iris-100 ring-1 ring-white/15 hover:bg-white/15">
              Try a demo
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 px-6 py-10 text-center text-xs text-iris-100/45">
        <p>
          Iris is a student research prototype for Samsung Solve for Tomorrow. It is not a medical device and does not diagnose diabetes or any other
          condition. If you&apos;re worried about your health, talk to a doctor.
        </p>
      </footer>
    </main>
  );
}
