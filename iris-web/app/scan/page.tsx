import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/blocks/site-nav";

export const metadata: Metadata = {
  title: "Eye scan",
  alternates: { canonical: "/scan" },
};

// The camera scan lives in the signed-in dashboard (app/(account)/dashboard/scan) so results can be saved.
export default function ScanPage() {
  return (
    <>
      <SiteNav />
      <main className="flex flex-1 items-center justify-center px-6 pb-24 pt-36">
        <div className="max-w-md text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full border">
            <Camera className="size-5" />
          </span>
          <h1 className="mt-6 text-3xl font-bold">Run the Iris camera scan</h1>
          <p className="mt-4 text-muted-foreground">
            About 30 seconds on your phone: three screen flashes, then your three results. Sign in so your results are saved to your dashboard.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href="/dashboard/scan">
                <Camera className="mr-2 size-4" /> Start a camera scan
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">
                <ArrowLeft className="mr-2 size-4" /> Back to home
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
