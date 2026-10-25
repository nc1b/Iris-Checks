import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import { BlurRevealText } from "@/components/ui/blur-reveal";
import { CHECKS, NEI_CREDIT } from "@/lib/checks";

export function ChecksSection() {
  return (
    <section id="checks" className="scroll-mt-24 border-t">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Three checks</p>
          <h2 className="mt-3 text-balance text-3xl font-bold md:text-5xl">
            <BlurRevealText text="One scan, three things to look for" />
          </h2>
          <p className="mt-4 text-muted-foreground">
            Each check reuses the same light and camera. None of them can diagnose anything. They&apos;re meant to tell you when it&apos;s worth
            seeing a doctor, and we&apos;re honest about how far along each one is.
          </p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {CHECKS.map((c, i) => (
            <Reveal key={c.id} delay={i * 120} className="h-full">
              <article className="group flex h-full flex-col overflow-hidden rounded-3xl border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-white/5">
                <figure className="-mx-6 -mt-6 mb-6">
                  <div className="relative aspect-[3/2] overflow-hidden border-b">
                    <Image
                      src={c.image.src}
                      alt={c.image.alt}
                      fill
                      sizes="(min-width: 1024px) 360px, 100vw"
                      className="object-cover grayscale transition-[filter,transform] duration-500 group-hover:scale-[1.03] group-hover:grayscale-0"
                    />
                    <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-4 pb-3 pt-10 text-sm font-medium text-white">
                      {c.image.caption}
                    </figcaption>
                  </div>
                  <p className="px-6 pt-2 text-[11px] text-muted-foreground">{NEI_CREDIT}</p>
                </figure>
                <div className="flex items-start justify-between">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-foreground text-background transition-transform duration-300 group-hover:scale-105">
                    <c.icon className="size-5" />
                  </span>
                  <span className="font-mono text-sm text-muted-foreground">0{i + 1}</span>
                </div>
                <h3 className="mt-5 text-2xl font-bold">{c.name}</h3>
                <p className="mt-1 text-sm font-medium text-muted-foreground">{c.signal}</p>
                <p className="mt-4 text-sm">{c.measures}</p>

                <dl className="mt-5 space-y-3 border-t pt-5 text-sm">
                  <div>
                    <dt className="font-medium">Why it matters</dt>
                    <dd className="mt-0.5 text-muted-foreground">{c.why}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-2 font-medium">
                      Evidence <span className="rounded-full border px-2 py-0.5 text-[11px] font-normal text-muted-foreground">{c.stage}</span>
                    </dt>
                    <dd className="mt-0.5 text-muted-foreground">{c.evidence}</dd>
                  </div>
                  <div>
                    <dt className="font-medium">Limits</dt>
                    <dd className="mt-0.5 text-muted-foreground">{c.limits}</dd>
                  </div>
                </dl>

                <p className="mt-auto pt-6 text-sm">
                  <span className="text-muted-foreground">If flagged: </span>
                  <span className="font-medium">{c.nextStep}</span>
                </p>
              </article>
            </Reveal>
          ))}
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          Only a doctor can diagnose diabetes, glaucoma or cataracts.{" "}
          <Link href="/research" className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-4 hover:opacity-70">
            See the studies <ArrowRight className="size-3.5" />
          </Link>
        </p>
      </div>
    </section>
  );
}
