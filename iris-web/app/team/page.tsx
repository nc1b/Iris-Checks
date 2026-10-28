import type { Metadata } from "next";
import { SiteFooter } from "@/components/blocks/site-footer";
import { SiteNav } from "@/components/blocks/site-nav";
import { Reveal } from "@/components/motion/reveal";
import { BlurRevealText } from "@/components/ui/blur-reveal";
import { TeamShowcase, type TeamMember } from "@/components/ui/team-showcase";

export const metadata: Metadata = {
  title: "Team",
  alternates: { canonical: "/team" },
  description: "The four students building Iris.",
};

const members: TeamMember[] = [
  { id: "divij", name: "Divij Velagapudi", role: "Developer" },
  { id: "sahaj", name: "Sahaj Kalia", role: "Idea and research" },
  { id: "yash", name: "Yash Tol", role: "Research and sponsor outreach" },
  { id: "udayan", name: "Udayan Ganguly", role: "Team member" },
];

export default function TeamPage() {
  return (
    <>
      <SiteNav />
      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-6 pb-24 pt-36">
          <h1 className="mt-5 max-w-3xl text-balance text-4xl font-bold md:text-6xl">
            <BlurRevealText text="The people behind Iris" />
          </h1>
          <p className="mt-6 max-w-2xl text-muted-foreground">
            Iris is built by a team of four students in Jacksonville, Florida.
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
