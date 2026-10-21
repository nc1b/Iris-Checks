"use client";

import React, { useState } from "react";

interface NavLink {
    label: string;
    href: string;
    isActive?: boolean;
}

interface Partner {
    /** Logo image. If omitted, `label` is shown as a text chip instead. */
    logoUrl?: string;
    label?: string;
    href: string;
}

interface ResponsiveHeroBannerProps {
    logoUrl?: string;
    logoHref?: string;
    backgroundImageUrl?: string;
    navLinks?: NavLink[];
    ctaButtonText?: string;
    ctaButtonHref?: string;
    badgeText?: string;
    badgeLabel?: string;
    title?: string;
    titleLine2?: string;
    description?: string;
    primaryButtonText?: string;
    primaryButtonHref?: string;
    secondaryButtonText?: string;
    secondaryButtonHref?: string;
    partnersTitle?: string;
    partners?: Partner[];
}

const ResponsiveHeroBanner: React.FC<ResponsiveHeroBannerProps> = ({
    logoUrl = "/iris-logo.svg",
    logoHref = "/",
    backgroundImageUrl = "https://images.unsplash.com/photo-1494869042583-f6c911f04b4c?w=2000&q=80&auto=format&fit=crop",
    navLinks = [
        { label: "Home", href: "/", isActive: true },
        { label: "How it works", href: "#how" },
        { label: "Science", href: "#science" },
        { label: "Privacy", href: "#privacy" },
    ],
    ctaButtonText = "Start scan",
    ctaButtonHref = "/scan",
    badgeLabel = "Prototype",
    badgeText = "Samsung Solve for Tomorrow 2026–27",
    title = "Your eyes know",
    titleLine2 = "before you do",
    description = "Iris uses your phone's camera, light and on-device AI to measure how your pupil reacts to a flash, then compares it with published research.",
    primaryButtonText = "Start eye scan",
    primaryButtonHref = "/scan",
    secondaryButtonText = "Try a demo",
    secondaryButtonHref = "/scan?demo=1",
    partnersTitle = "Built on published research",
    partners = [],
}) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <section className="w-full isolate min-h-screen overflow-hidden relative">
            <img
                src={backgroundImageUrl}
                alt=""
                className="w-full h-full object-cover absolute top-0 right-0 bottom-0 left-0"
            />
            {/* Green tint so the photo reads as part of the Iris palette */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-iris-950/85 via-iris-950/70 to-iris-950" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,197,94,0.18),transparent_60%)]" />
            <div className="pointer-events-none absolute inset-0 ring-1 ring-black/30" />

            <header className="z-10 xl:top-4 relative">
                <div className="mx-6">
                    <div className="flex items-center justify-between pt-4">
                        <a
                            href={logoHref}
                            aria-label="Iris home"
                            className="inline-flex items-center justify-center bg-center w-[100px] h-[40px] bg-contain bg-no-repeat rounded"
                            style={{ backgroundImage: `url(${logoUrl})` }}
                        />

                        <nav className="hidden md:flex items-center gap-2">
                            <div className="flex items-center gap-1 rounded-full bg-white/5 px-1 py-1 ring-1 ring-iris-300/15 backdrop-blur">
                                {navLinks.map((link, index) => (
                                    <a
                                        key={index}
                                        href={link.href}
                                        className={`px-3 py-2 text-sm font-medium hover:text-iris-100 font-sans transition-colors ${link.isActive ? "text-iris-100" : "text-iris-100/75"
                                            }`}
                                    >
                                        {link.label}
                                    </a>
                                ))}
                                <a
                                    href={ctaButtonHref}
                                    className="ml-1 inline-flex items-center gap-2 rounded-full bg-iris-300 px-3.5 py-2 text-sm font-medium text-iris-950 hover:bg-iris-200 font-sans transition-colors"
                                >
                                    {ctaButtonText}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                        <path d="M7 7h10v10" />
                                        <path d="M7 17 17 7" />
                                    </svg>
                                </a>
                            </div>
                        </nav>

                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ring-1 ring-iris-300/20 backdrop-blur"
                            aria-expanded={mobileMenuOpen}
                            aria-label="Toggle menu"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-iris-100">
                                <path d="M4 5h16" />
                                <path d="M4 12h16" />
                                <path d="M4 19h16" />
                            </svg>
                        </button>
                    </div>

                    {mobileMenuOpen && (
                        <div className="md:hidden mt-3 rounded-2xl bg-iris-950/90 p-2 ring-1 ring-iris-300/20 backdrop-blur animate-in fade-in slide-in-from-top-2">
                            {navLinks.map((link, index) => (
                                <a
                                    key={index}
                                    href={link.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="block rounded-xl px-4 py-3 text-sm font-medium text-iris-100/90 hover:bg-white/5"
                                >
                                    {link.label}
                                </a>
                            ))}
                            <a
                                href={ctaButtonHref}
                                className="mt-1 block rounded-xl bg-iris-300 px-4 py-3 text-center text-sm font-medium text-iris-950"
                            >
                                {ctaButtonText}
                            </a>
                        </div>
                    )}
                </div>
            </header>

            <div className="z-10 relative">
                <div className="sm:pt-28 md:pt-32 lg:pt-40 max-w-7xl mx-auto pt-28 px-6 pb-16">
                    <div className="mx-auto max-w-3xl text-center">
                        <div className="mb-6 inline-flex items-center gap-3 rounded-full bg-white/10 px-2.5 py-2 ring-1 ring-iris-300/20 backdrop-blur animate-fade-slide-in-1">
                            <span className="inline-flex items-center text-xs font-medium text-iris-950 bg-iris-300 rounded-full py-0.5 px-2 font-sans">
                                {badgeLabel}
                            </span>
                            <span className="text-sm font-medium text-iris-100/90 font-sans">
                                {badgeText}
                            </span>
                        </div>

                        <h1 className="sm:text-5xl md:text-6xl lg:text-7xl leading-tight text-4xl text-white tracking-tight font-instrument-serif font-normal animate-fade-slide-in-2">
                            {title}
                            <br className="hidden sm:block" />{" "}
                            <span className="text-iris-300 italic">{titleLine2}</span>
                        </h1>

                        <p className="sm:text-lg animate-fade-slide-in-3 text-base text-iris-50/80 max-w-2xl mt-6 mx-auto">
                            {description}
                        </p>

                        <div className="flex flex-col sm:flex-row sm:gap-4 mt-10 gap-3 items-center justify-center animate-fade-slide-in-4">
                            <a
                                href={primaryButtonHref}
                                className="inline-flex items-center gap-2 hover:bg-iris-200 text-sm font-medium text-iris-950 bg-iris-300 rounded-full py-3 px-5 font-sans transition-colors"
                            >
                                {primaryButtonText}
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                    <path d="M5 12h14" />
                                    <path d="m12 5 7 7-7 7" />
                                </svg>
                            </a>
                            <a
                                href={secondaryButtonHref}
                                className="inline-flex items-center gap-2 rounded-full bg-white/10 ring-1 ring-iris-300/20 px-5 py-3 text-sm font-medium text-iris-100 hover:bg-white/15 font-sans transition-colors"
                            >
                                {secondaryButtonText}
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                    <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />
                                </svg>
                            </a>
                        </div>
                    </div>

                    {partners.length > 0 && (
                        <div className="mx-auto mt-20 max-w-5xl">
                            <p className="animate-fade-slide-in-1 text-sm text-iris-100/70 text-center">
                                {partnersTitle}
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 animate-fade-slide-in-2 text-iris-100/70 mt-6 items-center justify-items-center gap-4">
                                {partners.map((partner, index) =>
                                    partner.logoUrl ? (
                                        <a
                                            key={index}
                                            href={partner.href}
                                            className="inline-flex items-center justify-center bg-center w-[120px] h-[36px] bg-cover rounded-full opacity-80 hover:opacity-100 transition-opacity"
                                            style={{ backgroundImage: `url(${partner.logoUrl})` }}
                                        />
                                    ) : (
                                        <a
                                            key={index}
                                            href={partner.href}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex min-h-[36px] w-full items-center justify-center rounded-full bg-white/5 px-3 py-2 text-center text-xs font-medium text-iris-100/80 ring-1 ring-iris-300/15 hover:bg-white/10 hover:text-iris-50 transition-colors"
                                        >
                                            {partner.label}
                                        </a>
                                    ),
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default ResponsiveHeroBanner;
