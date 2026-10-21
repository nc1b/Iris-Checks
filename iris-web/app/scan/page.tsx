import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Scanner from "@/components/scanner/scanner";

export const metadata: Metadata = {
  title: "Eye scan · Iris",
};

export default function ScanPage() {
  return (
    <main className="flex-1 bg-[radial-gradient(ellipse_at_top,rgba(34,197,94,0.12),transparent_55%)]">
      <div className="mx-auto max-w-3xl px-5 pb-20 pt-6">
        <header className="flex items-center justify-between">
          <Link href="/" aria-label="Iris home">
            <Image src="/iris-logo.svg" alt="Iris" width={90} height={36} priority />
          </Link>
          <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-iris-100/70 ring-1 ring-white/10">Prototype · not a medical device</span>
        </header>
        <h1 className="mt-10 font-instrument-serif text-4xl text-iris-50 sm:text-5xl">Pupil light-reflex scan</h1>
        <p className="mt-3 text-iris-100/70">
          Iris measures how your pupils react to one flash of light, then compares the result with published diabetes research.
        </p>
        <div className="mt-8">
          <Scanner />
        </div>
      </div>
    </main>
  );
}
