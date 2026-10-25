import Link from "next/link";
import { BookOpen, ShieldCheck, Smartphone, Users } from "lucide-react";
import TestimonialsBlock from "@/components/ui/testimonials-2";
import { HeroSection } from "@/components/blocks/hero-section-6";
import { TrailerSection } from "@/components/blocks/trailer-section";
import { SiteFooter } from "@/components/blocks/site-footer";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { ChecksSection } from "@/components/blocks/checks-section";
import { FaqSection } from "@/components/blocks/faq-section";
import { RoadmapSection } from "@/components/blocks/roadmap-section";
import { BlurRevealText } from "@/components/ui/blur-reveal";
import { SCAN_STEPS } from "@/lib/checks";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      alternateName: ["Iris", "irischecks.app"],
      description: SITE_DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/iris-logo-square.png`,
      description: "A student research project exploring phone-based eye checks.",
    },
  ],
};

export default function Home() {
  return (
    <HeroSection>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <TrailerSection />

      <ChecksSection />

      <section id="how-it-works" className="scroll-mt-24 border-t">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <Reveal>
            <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">How it will work</p>
            <h2 className="mt-3 max-w-xl text-balance text-3xl font-bold md:text-5xl">
              <BlurRevealText text="About 30 seconds, any phone" />
            </h2>
          </Reveal>
          <div className="relative mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div aria-hidden className="absolute left-0 right-0 top-[2.6rem] hidden h-px bg-border lg:block" />
            {SCAN_STEPS.map(({ icon: Icon, title, body }, i) => (
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

      <TestimonialsBlock />

      <RoadmapSection />

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
            <Button asChild variant="outline" className="mt-8">
              <Link href="/team">
                <Users className="mr-2 size-4" /> Meet the team <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px]">Coming soon</span>
              </Link>
            </Button>
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

      <FaqSection />

      <SiteFooter />
    </HeroSection>
  );
}
