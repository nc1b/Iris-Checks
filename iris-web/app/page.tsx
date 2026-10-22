import Link from "next/link";
import { ArrowRight, BookOpen, Building2, Clock, GraduationCap, HeartHandshake, Lock, ScanEye, ShieldCheck, Smartphone, Stethoscope, Sun } from "lucide-react";
import { TestimonialsMinimal } from "@/components/ui/minimal-testimonial";
import { AppTeaser } from "@/components/blocks/app-teaser";
import { EyeShowcase } from "@/components/blocks/eye-showcase";
import { HeroSection } from "@/components/blocks/hero-section-6";
import { SiteFooter } from "@/components/blocks/site-footer";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import FrequentlyAskedQuestions from "@/components/ui/frequently-asked-questions-with-accordion";

const steps = [
  {
    icon: Smartphone,
    title: "Hold up your phone",
    body: "Open Iris in a dim room and hold your phone at eye level. The camera lines up both eyes.",
  },
  {
    icon: Sun,
    title: "Capture the light response",
    body: "The plan uses screen light with both eyes in view, then a short flash per eye while you cover the other. Images captured along the way would also be checked for lens cloudiness.",
  },
  {
    icon: BookOpen,
    title: "Three checks, explained",
    body: "Diabetes-related pupil responses, glaucoma-related differences between eyes, and cataract-related cloudiness. Each planned check would explain the finding and when to seek professional care.",
  },
];

const supporterTypes = [
  { icon: Stethoscope, title: "Clinics and eye doctors", body: "Advice on safe testing and checking our results against clinic devices." },
  { icon: GraduationCap, title: "Schools and mentors", body: "Guidance from teachers, engineers and researchers as we build and test." },
  { icon: Building2, title: "Local organizations", body: "Help reaching people who could benefit from a free eye check." },
];

export default function Home() {
  return (
    <HeroSection>
      <section aria-label="Interactive eye" className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <Reveal effect="zoom">
            <EyeShowcase />
          </Reveal>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-24 border-t">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <Reveal>
            <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">How it will work</p>
            <h2 className="mt-3 max-w-xl text-balance text-3xl font-bold md:text-4xl">A quick check, planned for any phone</h2>
          </Reveal>
          <div className="relative mt-12 grid gap-4 md:grid-cols-3">
            <div aria-hidden className="absolute left-0 right-0 top-[2.6rem] hidden h-px bg-border md:block" />
            {steps.map(({ icon: Icon, title, body }, i) => (
              <Reveal key={title} delay={i * 150}>
                <div className="group relative h-full rounded-2xl border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-white/5">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-full border bg-background transition-colors duration-300 group-hover:bg-foreground group-hover:text-background">
                      <Icon className="size-4" />
                    </span>
                    <span className="text-sm text-muted-foreground">Step {i + 1}</span>
                  </div>
                  <h3 className="mt-4 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="coming-soon" className="scroll-mt-24 border-t bg-muted/40">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-6 py-24 md:grid-cols-2">
          <Reveal effect="left">
            <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium">
              <Clock className="size-3.5" /> Coming soon
            </span>
            <h2 className="mt-5 text-balance text-3xl font-bold md:text-4xl">A sneak peek at the app</h2>
            <p className="mt-4 text-muted-foreground">
              Here&apos;s the plan: line up your eyes, capture their light responses and images, then see three checks explained in plain
              language: diabetes, glaucoma, and cataracts. All three are in development and need testing on real phones before launch.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <ScanEye className="mt-0.5 size-4 shrink-0" />
                Three planned checks using your phone&apos;s camera and screen
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
            <Button asChild variant="outline" className="mt-8">
              <Link href="/research">
                Read the research <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </Reveal>
          <Reveal effect="zoom" delay={150}>
            <AppTeaser />
          </Reveal>
        </div>
      </section>

      <section aria-label="Quotes" className="relative overflow-hidden border-t">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--color-muted),transparent_70%)] opacity-70" />
        <Reveal className="relative">
          <p className="pt-20 text-center text-sm font-medium uppercase tracking-widest text-muted-foreground">Why it matters</p>
          <TestimonialsMinimal />
        </Reveal>
      </section>

      <section id="supporters" className="scroll-mt-24 border-t">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <Reveal className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Sponsors and supporters</p>
            <h2 className="mt-3 text-balance text-3xl font-bold md:text-4xl">Help us bring eye checks to every phone</h2>
            <p className="mt-4 text-muted-foreground">
              Iris is a student project and we&apos;re looking for our first sponsors and supporters. Your name or logo could be here.
            </p>
          </Reveal>

          <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Reveal key={i} effect="zoom" delay={i * 100}>
                <div className="flex aspect-[3/2] items-center justify-center rounded-2xl border border-dashed border-foreground/25 text-center text-sm text-muted-foreground transition-colors duration-300 hover:border-foreground hover:text-foreground">
                  <span className="flex flex-col items-center gap-2">
                    <HeartHandshake className="size-5" />
                    Your logo here
                  </span>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {supporterTypes.map(({ icon: Icon, title, body }, i) => (
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
            <p className="text-sm text-muted-foreground">Interested in supporting Iris? Contact details for the team are coming soon.</p>
          </Reveal>
        </div>
      </section>

      <section id="about" className="scroll-mt-24 overflow-hidden border-t bg-muted/40">
        <div className="mx-auto grid max-w-5xl gap-10 px-6 py-24 md:grid-cols-[1.1fr_1fr]">
          <Reveal effect="left">
            <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">About</p>
            <h2 className="mt-3 text-balance text-3xl font-bold md:text-4xl">A student project with a simple goal</h2>
            <p className="mt-4 text-muted-foreground">
              Millions of people live with health problems they don&apos;t know about yet. Iris is a team of students exploring whether the phone
              already in your pocket could flag early warning signs through your eyes, and point you toward a doctor sooner.
            </p>
            <p className="mt-4 text-muted-foreground">
              Iris is a research prototype, not a medical device. It will never diagnose anything; it&apos;s meant to help people decide when to get
              checked.
            </p>
          </Reveal>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
            {[
              { icon: ShieldCheck, title: "Privacy first", body: "Camera images are planned to stay on your phone." },
              { icon: BookOpen, title: "Research led", body: "Built on published, peer-reviewed eye studies." },
              { icon: Smartphone, title: "No extra hardware", body: "Just the phone you already have." },
            ].map(({ icon: Icon, title, body }, i) => (
              <Reveal key={title} delay={i * 120} effect="right">
                <div className="flex items-start gap-4 rounded-2xl border bg-background p-5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full border">
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <h3 className="font-semibold">{title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <FrequentlyAskedQuestions />

      <SiteFooter />
    </HeroSection>
  );
}
