import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Press kit",
  description: "Screens of the Iris website and phone scan, for videos and press.",
  // Unlisted: not linked from the site, not in the sitemap, not for search engines.
  robots: { index: false, follow: false },
};

type Shot = { file: string; title: string; caption: string };

const SECTIONS: { heading: string; note?: string; shots: Shot[] }[] = [
  {
    heading: "The website",
    shots: [
      { file: "01-home", title: "Home", caption: "irischecks.app home: “Many eye checks. Just your phone.” Diabetes (pupil light reflex), glaucoma (left vs right reaction), cataracts (lens cloudiness)." },
      { file: "02-how-it-works", title: "How it works", caption: "About 30 seconds, any phone. Step 1 Get close, Step 2 Right eye, one flash, Step 3 Left eye, one flash, Step 4 Three results." },
      { file: "03-three-checks", title: "The three checks", caption: "One scan, three things to look for: diabetes, glaucoma and cataracts." },
    ],
  },
  {
    heading: "The phone scan, step by step",
    note: "Real screens of the Iris camera scan on a phone. The eye in these test runs is Iris's simulated test eye (scripts/scan-bench), not a patient.",
    shots: [
      { file: "04-step1-line-up", title: "Steps 1–2: line up and hold still", caption: "Cover one eye, bring the phone close. Iris locks onto the iris and pupil: in the ring, same distance, pupil sharp, eye open, other eye covered, steady." },
      { file: "05-step3-left-eye", title: "Step 3: left eye, one flash", caption: "A 3-second countdown, then the screen flashes once and Iris records how the pupil reacts." },
      { file: "06-step4-results-typical", title: "Step 4: three results (typical)", caption: "Diabetes, glaucoma and cataracts each say “Looks typical”, with the measurements behind them." },
      { file: "07-step4-results-glaucoma", title: "Step 4: one eye reacts weaker", caption: "Glaucoma check: “See a doctor”. Balance 53%: the left eye's reaction is about half the right eye's." },
      { file: "08-step4-results-cataract", title: "Step 4: a cloudy lens", caption: "Cataract check: “See a doctor” when the pupil looks grey instead of black." },
    ],
  },
  {
    heading: "Real eyes through the eye photo check",
    note: "Real photos of people's eyes, run through Iris's actual photo check. Photos via Wikimedia Commons: NIH/National Eye Institute (public domain), Rakesh Ahuja, MD (CC BY-SA 3.0), Rapidreflex (CC BY-SA 4.0).",
    shots: [
      { file: "09-real-cataract-photo", title: "A real cataract", caption: "A real eye with a cataract, found and measured by Iris (rings on the iris and pupil)." },
      { file: "10-real-cataract-result", title: "Result: the pupil looks grey or cloudy", caption: "Iris: “The pupil looks grey or cloudy”, a possible sign of lens cloudiness. Educational, not a diagnosis." },
      { file: "11-real-cataract2-result", title: "A second real cataract", caption: "Another real cataract, also read as a cloudy lens." },
      { file: "12-real-healthy-result", title: "A healthy eye", caption: "A healthy eye: “Nothing of concern was visible”." },
    ],
  },
];

export default function PressKitPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold md:text-5xl">Iris press kit</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Screens of irischecks.app and the Iris phone scan. Iris is a student research prototype, not a medical device: it can&apos;t diagnose
        diabetes, glaucoma or cataracts.
      </p>
      {SECTIONS.map((s) => (
        <section key={s.heading} className="mt-14">
          <h2 className="text-2xl font-semibold">{s.heading}</h2>
          {s.note && <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{s.note}</p>}
          <div className="mt-6 grid gap-8 md:grid-cols-2">
            {s.shots.map((shot) => (
              <figure key={shot.file}>
                <Image src={`/press-kit/${shot.file}.jpg`} alt={`${shot.title}. ${shot.caption}`} width={1920} height={1080} className="w-full rounded-xl border" />
                <figcaption className="mt-2 text-sm">
                  <span className="font-medium">{shot.title}.</span> <span className="text-muted-foreground">{shot.caption}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
