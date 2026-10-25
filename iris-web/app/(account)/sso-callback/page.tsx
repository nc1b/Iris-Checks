"use client";

import { HandleSSOCallback } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { goToDashboard } from "@/components/auth/auth-frame";

export default function SSOCallbackPage() {
  const router = useRouter();
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
      <Loader2 className="size-5 animate-spin" />
      Signing you in…
      <HandleSSOCallback
        navigateToApp={({ decorateUrl }) => goToDashboard(decorateUrl, router.push)}
        navigateToSignIn={() => router.push("/sign-in")}
        navigateToSignUp={() => router.push("/sign-up")}
      />
    </div>
  );
}
