"use client";

import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/blocks/theme-toggle";
import { AuthShell, type Testimonial } from "@/components/ui/sign-in";

const quotes: Testimonial[] = [
  { avatarSrc: "/quotes/franklin.jpg", name: "Benjamin Franklin", handle: "Inventor, 1735", text: "An ounce of prevention is worth a pound of cure." },
  { avatarSrc: "/quotes/leonardo.jpg", name: "Leonardo da Vinci", handle: "Notebooks", text: "The eye, which is termed the window of the soul…" },
  { avatarSrc: "/quotes/clarke.jpg", name: "Arthur C. Clarke", handle: "Profiles of the Future", text: "Any sufficiently advanced technology is indistinguishable from magic." },
];

const HERO = "https://images.unsplash.com/photo-1576176243977-7c62b6472a31?w=1600&q=80&auto=format&fit=crop";

export function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <AuthShell
      heroImageSrc={HERO}
      heroAlt="A person in a dark room holding a phone up close to their face"
      testimonials={quotes}
      top={
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 rounded-xl py-1 pr-2 transition-opacity hover:opacity-80">
            <Image src="/iris-logo.png" alt="" width={663} height={259} className="h-auto w-10 invert dark:invert-0" />
            <span className="leading-tight">
              <span className="block text-[15px] font-semibold tracking-tight">Iris</span>
              <span className="block text-[11px] text-muted-foreground">Research prototype</span>
            </span>
          </Link>
          <ThemeToggle className="size-10 rounded-xl" />
        </div>
      }
    >
      {children}
    </AuthShell>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="animate-in fade-in rounded-2xl border border-foreground/20 bg-foreground/[0.04] px-4 py-3 text-sm">
      {message}
    </p>
  );
}

export function errorText(error: { message?: string; longMessage?: string } | null | undefined) {
  if (!error) return null;
  return error.longMessage || error.message || "Something went wrong. Please try again.";
}

export function goToDashboard(decorateUrl: (url: string) => string, push: (url: string) => void) {
  const url = decorateUrl("/dashboard");
  if (url.startsWith("http")) window.location.href = url;
  else push(url);
}
