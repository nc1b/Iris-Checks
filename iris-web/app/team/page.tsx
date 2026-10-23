import type { Metadata } from "next";
import { Clock } from "lucide-react";
import { SiteFooter } from "@/components/blocks/site-footer";
import { SiteNav } from "@/components/blocks/site-nav";
import { Reveal } from "@/components/motion/reveal";
import { BlurRevealText } from "@/components/ui/blur-reveal";
import { TeamShowcase, type TeamMember } from "@/components/ui/team-showcase";

export const metadata: Metadata = {
  title: "Team",
  alternates: { canonical: "/team" },
  description: "The students building Iris. Team profiles are coming soon.",
};

// Placeholders until the team adds names and photos (add `image` and a real `name` per person).
const members: TeamMember[] = [
  { id: "lead", name: "Project lead", role: "Coming soon" },
  { id: "research", name: "Research", role: "Coming soon" },
  { id: "app", name: "App and AI", role: "Coming soon" },
  { id: "design", name: "Design", role: "Coming soon" },
  { id: "outreach", name: "Community outreach", role: "Coming soon" },
  { id: "mentor", name: "Mentors and advisors", role: "Coming soon" },
];

export default function TeamPage() {
  return (
    <>
      <SiteNav />
      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-6 pb-24 pt-36">
          <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium">
            <Clock className="size-3.5" /> Coming soon
          </span>
          <h1 className="mt-5 max-w-3xl text-balance text-4xl font-bold md:text-6xl">
            <BlurRevealText text="The people behind Iris" />
          </h1>
          <p className="mt-6 max-w-2xl text-muted-foreground">
            Iris is built by a team of students, with help from mentors. We&apos;ll introduce everyone here soon. Until then, these are the roles
            that keep the project moving.
          </p>

          <Reveal className="mt-14" effect="zoom">
            <div className="relative">
              <TeamShowcase members={members} />
              <span className="absolute -top-3 left-2 rotate-[-4deg] rounded-full border bg-background px-3 py-1 text-xs font-semibold shadow-lg md:left-6">
                Photos coming soon
              </span>
            </div>
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
