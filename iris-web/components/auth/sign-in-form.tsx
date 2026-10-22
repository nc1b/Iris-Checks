"use client";

import { useAuth, useSignIn } from "@clerk/nextjs";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FormError, errorText, goToDashboard } from "@/components/auth/auth-frame";
import { GlassInputWrapper, GoogleIcon, PasswordInput } from "@/components/ui/sign-in";

type Step = "password" | "device-code" | "reset-email" | "reset-code" | "reset-password";

/**
 * Sign in with Clerk's custom-flow API (Clerk v7 "signals"):
 * email + password → (new device: emailed code) → session → dashboard.
 * Also: Google, and resetting a forgotten password with an emailed code.
 */
export function SignInForm() {
  const { signIn, fetchStatus } = useSignIn();
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const busy = fetchStatus === "fetching" || !isLoaded;

  // Already signed in? Go straight to the dashboard.
  useEffect(() => {
    if (isLoaded && isSignedIn) router.replace("/dashboard");
  }, [isLoaded, isSignedIn, router]);

  const finish = async () => {
    const { error } = await signIn.finalize({ navigate: ({ decorateUrl }) => goToDashboard(decorateUrl, router.push) });
    if (error) setError(errorText(error));
  };

  // What to do after a step succeeds, based on what Clerk still needs.
  const next = async () => {
    if (signIn.status === "complete") return finish();
    if (signIn.status === "needs_client_trust" || signIn.status === "needs_second_factor") {
      const { error } = await signIn.mfa.sendEmailCode();
      if (error) return setError(errorText(error));
      setCode("");
      setStep("device-code");
      return;
    }
    if (signIn.status === "needs_new_password") return setStep("reset-password");
    setError("This account needs a sign-in step this prototype doesn't support yet. Try Google, or reset your password.");
  };

  const onPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error } = await signIn.password({ identifier: email.trim(), password });
    if (error) return setError(errorText(error));
    await next();
  };

  const onDeviceCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error } = await signIn.mfa.verifyEmailCode({ code: code.trim() });
    if (error) return setError(errorText(error));
    await next();
  };

  const onResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const created = await signIn.create({ identifier: email.trim() });
    if (created.error) return setError(errorText(created.error));
    const { error } = await signIn.resetPasswordEmailCode.sendCode();
    if (error) return setError(errorText(error));
    setCode("");
    setStep("reset-code");
  };

  const onResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error } = await signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() });
    if (error) return setError(errorText(error));
    setPassword("");
    setStep("reset-password");
  };

  const onNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error } = await signIn.resetPasswordEmailCode.submitPassword({ password });
    if (error) return setError(errorText(error));
    await next();
  };

  const onGoogle = async () => {
    setError(null);
    const { error } = await signIn.sso({ strategy: "oauth_google", redirectUrl: "/dashboard", redirectCallbackUrl: "/sso-callback" });
    if (error) setError(errorText(error));
  };

  const back = async () => {
    await signIn.reset();
    setError(null);
    setCode("");
    setStep("password");
  };

  if (step !== "password") {
    const content = {
      "device-code": { title: "Check your email", body: `We sent a 6-digit code to ${email} to confirm it's you on this device.`, submit: "Verify and sign in", onSubmit: onDeviceCode },
      "reset-email": { title: "Reset your password", body: "Enter your email and we'll send you a code.", submit: "Send code", onSubmit: onResetEmail },
      "reset-code": { title: "Check your email", body: `Enter the 6-digit code we sent to ${email}.`, submit: "Continue", onSubmit: onResetCode },
      "reset-password": { title: "Choose a new password", body: "At least 8 characters.", submit: "Save and sign in", onSubmit: onNewPassword },
    }[step];

    return (
      <div className="flex flex-col gap-6">
        <button type="button" onClick={back} className="animate-element flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to sign in
        </button>
        <h1 className="animate-element animate-delay-100 text-4xl font-semibold leading-tight tracking-tight md:text-5xl">{content.title}</h1>
        <p className="animate-element animate-delay-200 text-muted-foreground">{content.body}</p>
        <form className="space-y-5" onSubmit={content.onSubmit}>
          {step === "reset-email" && (
            <EmailField value={email} onChange={setEmail} />
          )}
          {(step === "device-code" || step === "reset-code") && <CodeField value={code} onChange={setCode} />}
          {step === "reset-password" && (
            <div className="animate-element animate-delay-300">
              <label htmlFor="password" className="text-sm font-medium text-muted-foreground">
                New password
              </label>
              <PasswordInput autoComplete="new-password" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          )}
          <FormError message={error} />
          <SubmitButton busy={busy}>{content.submit}</SubmitButton>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="animate-element animate-delay-100 text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
        <span className="font-light">Welcome</span> back
      </h1>
      <p className="animate-element animate-delay-200 text-muted-foreground">
        Sign in to the Iris research prototype to run demo scans and see your results over time.
      </p>

      <form className="space-y-5" onSubmit={onPassword}>
        <EmailField value={email} onChange={setEmail} />

        <div className="animate-element animate-delay-400">
          <label htmlFor="password" className="text-sm font-medium text-muted-foreground">
            Password
          </label>
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        <div className="animate-element animate-delay-500 flex items-center justify-end text-sm">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setStep("reset-email");
            }}
            className="underline-offset-4 transition-colors hover:underline"
          >
            Forgot password?
          </button>
        </div>

        <FormError message={error} />
        <SubmitButton busy={busy} className="animate-element animate-delay-600">
          Sign In
        </SubmitButton>
      </form>

      <Divider />

      <button
        type="button"
        onClick={onGoogle}
        disabled={busy}
        className="animate-element animate-delay-800 flex w-full items-center justify-center gap-3 rounded-2xl border border-border py-4 transition-colors hover:bg-secondary disabled:opacity-60"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <p className="animate-element animate-delay-900 text-center text-sm text-muted-foreground">
        New to Iris?{" "}
        <Link href="/sign-up" className="font-medium text-foreground underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}

export function EmailField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="animate-element animate-delay-300">
      <label htmlFor="email" className="text-sm font-medium text-muted-foreground">
        Email address
      </label>
      <GlassInputWrapper>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Enter your email address"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-2xl bg-transparent p-4 text-sm focus:outline-none"
        />
      </GlassInputWrapper>
    </div>
  );
}

export function CodeField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="animate-element animate-delay-300">
      <label htmlFor="code" className="text-sm font-medium text-muted-foreground">
        Verification code
      </label>
      <GlassInputWrapper>
        <input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          maxLength={6}
          placeholder="123456"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
          className="w-full rounded-2xl bg-transparent p-4 text-center font-mono text-2xl tracking-[0.5em] focus:outline-none"
        />
      </GlassInputWrapper>
    </div>
  );
}

export function SubmitButton({ busy, children, className = "" }: { busy: boolean; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 ${className}`}
    >
      {busy && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Divider() {
  return (
    <div className="animate-element animate-delay-700 relative flex items-center justify-center">
      <span className="w-full border-t border-border"></span>
      <span className="absolute bg-background px-4 text-sm text-muted-foreground">Or continue with</span>
    </div>
  );
}
