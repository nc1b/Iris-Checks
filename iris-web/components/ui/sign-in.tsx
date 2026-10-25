"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48" aria-hidden>
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s12-5.373 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.743z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-2.641-.21-5.236-.611-7.743z" />
  </svg>
);

export interface Testimonial {
  avatarSrc: string;
  name: string;
  handle: string;
  text: string;
}

interface SignInPageProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  heroImageSrc?: string;
  testimonials?: Testimonial[];
  onSignIn?: (event: React.FormEvent<HTMLFormElement>) => void;
  onGoogleSignIn?: () => void;
  onResetPassword?: () => void;
  onCreateAccount?: () => void;
}

export const GlassInputWrapper = ({ children, invalid }: { children: React.ReactNode; invalid?: boolean }) => (
  <div
    className={cn(
      "mt-1.5 rounded-2xl border bg-foreground/[0.03] backdrop-blur-sm transition-colors focus-within:border-foreground/40 focus-within:bg-foreground/[0.06]",
      invalid ? "border-foreground/60" : "border-border",
    )}
  >
    {children}
  </div>
);

export const TestimonialCard = ({ testimonial, delay }: { testimonial: Testimonial; delay: string }) => (
  <div className={`animate-testimonial ${delay} flex w-64 items-start gap-3 rounded-3xl border border-white/15 bg-black/40 p-5 text-white backdrop-blur-xl`}>
    <img src={testimonial.avatarSrc} className="h-10 w-10 rounded-2xl object-cover" alt={testimonial.name} />
    <div className="text-sm leading-snug">
      <p className="flex items-center gap-1 font-medium">{testimonial.name}</p>
      <p className="text-white/60">{testimonial.handle}</p>
      <p className="mt-1 text-white/85">{testimonial.text}</p>
    </div>
  </div>
);

export function PasswordInput({
  name = "password",
  placeholder = "Enter your password",
  autoComplete = "current-password",
  value,
  onChange,
  invalid,
}: {
  name?: string;
  placeholder?: string;
  autoComplete?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  invalid?: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <GlassInputWrapper invalid={invalid}>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          aria-invalid={invalid || undefined}
          className="w-full rounded-2xl bg-transparent p-4 pr-12 text-sm focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-3 flex items-center"
        >
          {showPassword ? (
            <EyeOff className="h-5 w-5 text-muted-foreground transition-colors hover:text-foreground" />
          ) : (
            <Eye className="h-5 w-5 text-muted-foreground transition-colors hover:text-foreground" />
          )}
        </button>
      </div>
    </GlassInputWrapper>
  );
}

export function AuthShell({
  children,
  heroImageSrc,
  heroAlt = "",
  testimonials = [],
  top,
}: {
  children: React.ReactNode;
  heroImageSrc?: string;
  heroAlt?: string;
  testimonials?: Testimonial[];
  top?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[100dvh] w-full flex-col md:h-[100dvh] md:flex-row">
      <section className="relative flex flex-1 flex-col p-6 sm:p-8">
        {top}
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </section>

      {heroImageSrc && (
        <section className="relative hidden flex-1 p-4 md:block">
          <div role="img" aria-label={heroAlt} className="animate-slide-right animate-delay-300 absolute inset-4 overflow-hidden rounded-3xl">
            <div className="absolute inset-0 bg-cover bg-center grayscale" style={{ backgroundImage: `url(${heroImageSrc})` }} />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          </div>
          {testimonials.length > 0 && (
            <div className="absolute bottom-8 left-1/2 flex w-full -translate-x-1/2 justify-center gap-4 px-8">
              <TestimonialCard testimonial={testimonials[0]} delay="animate-delay-1000" />
              {testimonials[1] && (
                <div className="hidden xl:flex">
                  <TestimonialCard testimonial={testimonials[1]} delay="animate-delay-1200" />
                </div>
              )}
              {testimonials[2] && (
                <div className="hidden 2xl:flex">
                  <TestimonialCard testimonial={testimonials[2]} delay="animate-delay-1400" />
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export const SignInPage: React.FC<SignInPageProps> = ({
  title = <span className="font-light tracking-tighter text-foreground">Welcome</span>,
  description = "Access your account and continue your journey with us",
  heroImageSrc,
  testimonials = [],
  onSignIn,
  onGoogleSignIn,
  onResetPassword,
  onCreateAccount,
}) => {
  return (
    <AuthShell heroImageSrc={heroImageSrc} testimonials={testimonials}>
      <div className="flex flex-col gap-6">
        <h1 className="animate-element animate-delay-100 text-4xl font-semibold leading-tight md:text-5xl">{title}</h1>
        <p className="animate-element animate-delay-200 text-muted-foreground">{description}</p>

        <form className="space-y-5" onSubmit={onSignIn}>
          <div className="animate-element animate-delay-300">
            <label htmlFor="email" className="text-sm font-medium text-muted-foreground">
              Email Address
            </label>
            <GlassInputWrapper>
              <input id="email" name="email" type="email" placeholder="Enter your email address" className="w-full rounded-2xl bg-transparent p-4 text-sm focus:outline-none" />
            </GlassInputWrapper>
          </div>

          <div className="animate-element animate-delay-400">
            <label htmlFor="password" className="text-sm font-medium text-muted-foreground">
              Password
            </label>
            <PasswordInput />
          </div>

          <div className="animate-element animate-delay-500 flex items-center justify-between text-sm">
            <label className="flex cursor-pointer items-center gap-3">
              <input type="checkbox" name="rememberMe" className="custom-checkbox" />
              <span className="text-foreground/90">Keep me signed in</span>
            </label>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onResetPassword?.();
              }}
              className="underline-offset-4 transition-colors hover:underline"
            >
              Reset password
            </a>
          </div>

          <button type="submit" className="animate-element animate-delay-600 w-full rounded-2xl bg-primary py-4 font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            Sign In
          </button>
        </form>

        <div className="animate-element animate-delay-700 relative flex items-center justify-center">
          <span className="w-full border-t border-border"></span>
          <span className="absolute bg-background px-4 text-sm text-muted-foreground">Or continue with</span>
        </div>

        <button
          onClick={onGoogleSignIn}
          className="animate-element animate-delay-800 flex w-full items-center justify-center gap-3 rounded-2xl border border-border py-4 transition-colors hover:bg-secondary"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <p className="animate-element animate-delay-900 text-center text-sm text-muted-foreground">
          New to our platform?{" "}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onCreateAccount?.();
            }}
            className="font-medium text-foreground underline-offset-4 transition-colors hover:underline"
          >
            Create Account
          </a>
        </p>
      </div>
    </AuthShell>
  );
};
