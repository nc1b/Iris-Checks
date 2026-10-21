import { BookOpen, Clock, ExternalLink, Lock, ScanEye, Smartphone, Sun } from "lucide-react";
import { HeroSection } from "@/components/blocks/hero-section-6";
import { STUDIES } from "@/lib/reference";

const steps = [
  {
    icon: Smartphone,
    title: "Hold up your phone",
    body: "Open Iris in a dim room and hold your phone at eye level. The camera lines up both eyes.",
  },
  {
    icon: Sun,
    title: "One flash of light",
    body: "The screen flashes for a second while the camera records how your pupils react.",
  },
  {
    icon: BookOpen,
    title: "Compare with research",
    body: "Your result is compared with published pupil studies and explained in plain language.",
  },
];

export default function Home() {
  return (
    <HeroSection>
      <section id="how-it-works" className="scroll-mt-20 border-t">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">How it will work</p>
          <h2 className="mt-3 max-w-xl text-balance text-3xl font-bold md:text-4xl">A 10-second check, planned for any phone</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {steps.map(({ icon: Icon, title, body }, i) => (
              <div key={title} className="rounded-2xl border bg-card p-6">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-full border">
                    <Icon className="size-4" />
                  </span>
                  <span className="text-sm text-muted-foreground">Step {i + 1}</span>
                </div>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="coming-soon" className="scroll-mt-20 border-t bg-muted/40">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-6 py-20 md:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium">
              <Clock className="size-3.5" /> Coming soon
            </span>
            <h2 className="mt-5 text-balance text-3xl font-bold md:text-4xl">Eye scanning is coming soon</h2>
            <p className="mt-4 text-muted-foreground">
              We&apos;re testing the scan on real phones and checking our measurements against published studies before anyone can use it.
              Accounts and sign-up will open when it&apos;s ready.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <ScanEye className="mt-0.5 size-4 shrink-0" />
                Eye tracking and pupil measurement on your phone
              </li>
              <li className="flex items-start gap-3">
                <Lock className="mt-0.5 size-4 shrink-0" />
                Camera images stay on your device
              </li>
              <li className="flex items-start gap-3">
                <Clock className="mt-0.5 size-4 shrink-0" />
                Testing in progress, not available yet
              </li>
            </ul>
          </div>
          <figure className="overflow-hidden rounded-3xl border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1643325904565-065f1bf68448?w=1200&q=80&auto=format&fit=crop"
              alt="A woman in a scarf looking closely at her phone screen"
              width={1200}
              height={1500}
              className="aspect-[4/5] w-full object-cover grayscale"
            />
          </figure>
        </div>
      </section>

      <section id="research" className="scroll-mt-20 border-t">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Research</p>
          <h2 className="mt-3 max-w-xl text-balance text-3xl font-bold md:text-4xl">Built on published eye research</h2>
          <ul className="mt-10 grid gap-4 md:grid-cols-2">
            {STUDIES.map((s) => (
              <li key={s.id} className="rounded-2xl border bg-card p-6">
                <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-start gap-2 font-semibold hover:underline">
                  {s.title}
                  <ExternalLink className="mt-1 size-3.5 shrink-0" />
                </a>
                <p className="mt-1 text-xs text-muted-foreground">
                  {s.journal}
                  {s.year ? ` · ${s.year}` : ""}
                </p>
                <p className="mt-3 text-sm text-muted-foreground">{s.finding}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer id="about" className="scroll-mt-20 border-t">
        <div className="mx-auto max-w-5xl px-6 py-12 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">About Iris</p>
          <p className="mt-2 max-w-2xl">
            Iris is a student project for Samsung Solve for Tomorrow 2026–27. It is not a medical device and does not diagnose any condition.
            If you&apos;re worried about your eyes or your health, talk to a doctor.
          </p>
        </div>
      </footer>
    </HeroSection>
  );
}
