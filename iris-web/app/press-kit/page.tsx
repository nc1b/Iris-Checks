import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Press kit",
  description: "Screens of the Iris website and phone scan, for videos and press.",
  robots: { index: false, follow: false },
};

type Shot = { file: string; title: string; caption: string };

const SECTIONS: { heading: string; note?: string; shots: Shot[] }[] = [
  {
    heading: "From the home page to the pupil test (desktop, dark mode)",
    shots: [
      { file: "01-home", title: "1. Home", caption: "irischecks.app home in dark mode: “Many eye checks. Just your phone.” Click “Sign in” at the top right." },
      { file: "02-sign-in", title: "2. Sign in", caption: "The Iris sign-in page: “Welcome back”, sign in with email or Google." },
      { file: "03-dashboard", title: "3. Dashboard: click “Pupil test”", caption: "The signed-in dashboard with the three checks. Click “Pupil test” (next to “Eye photo check”) to start." },
      { file: "04-pupil-test", title: "4. Pupil reflex test", caption: "The pupil reflex test: about 30 seconds, one eye at a time. Step 1 Get close, Step 2 Right eye, one flash, Step 3 Left eye, one flash, Step 4 Three results. Click “Open camera”." },
    ],
  },
  {
    heading: "The pupil test on a real person's eye",
    note: "A real recorded human pupil reacting to light (Wikimedia Commons, “Photopupillary reflex.gif” by 01syhr, CC BY-SA 4.0) was played into the Iris pupil test as the camera; Iris's actual scan code found and measured it. The same recording was used for both eyes.",
    shots: [
      { file: "05-real-eye-locked-on", title: "5. Iris locks onto the real eye", caption: "Full screen camera: a green ring on the iris and a white ring on the pupil. Right eye in the ring, close enough, pupil sharp, eye open, steady. Pupil about 7 mm, tracking 100%." },
      { file: "06-countdown", title: "6. Countdown", caption: "Look at the dot. Keep your other eye covered. 3, 2, 1." },
      { file: "07-flash", title: "7. One flash", caption: "The screen flashes white for one second (the top by the camera stays dark) and Iris records the real pupil shrinking." },
      { file: "08-results", title: "8. The analysis", caption: "Your three results from the real eye: Diabetes looks typical (constriction 41%, reaction delay 0.40 s, speed 5 mm/s), Glaucoma looks typical, Cataracts look typical (haze 7%), capture quality 100%." },
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
