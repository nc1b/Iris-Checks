import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Eye scan · Coming soon · Iris",
};

// The scanner (components/scanner) is kept in the codebase but switched off until it has been tested on real phones.
export default function ScanPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="max-w-md text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full border">
          <Clock className="size-5" />
        </span>
        <h1 className="mt-6 text-3xl font-bold">Eye scanning is coming soon</h1>
        <p className="mt-4 text-muted-foreground">
          We&apos;re still testing the scan on real phones. It isn&apos;t available yet. Check back soon.
        </p>
        <Button asChild variant="outline" className="mt-8">
          <Link href="/">
            <ArrowLeft className="mr-2 size-4" /> Back to home
          </Link>
        </Button>
      </div>
    </main>
  );
}
