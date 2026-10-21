'use client'
import Link from 'next/link'
import { ArrowUp, ArrowUpRight, BookOpen, Heart, MessageCircle } from 'lucide-react'
import { Logo } from '@/components/blocks/site-nav'
import { OPEN_CHAT_EVENT } from '@/components/blocks/chat-widget'

export const SITE_VERSION = 'v0.3.0'

type FooterLink = { label: string; href: string; external?: boolean; onClick?: () => void }

const openChat = () => window.dispatchEvent(new Event(OPEN_CHAT_EVENT))

const columns: { title: string; links: FooterLink[] }[] = [
    {
        title: 'Project',
        links: [
            { label: 'How it works', href: '/#how-it-works' },
            { label: 'Research', href: '/research' },
            { label: 'Coming soon', href: '/#coming-soon' },
        ],
    },
    {
        title: 'Community',
        links: [
            { label: 'Supporters', href: '/#supporters' },
            { label: 'Ask our AI', href: '#', onClick: openChat },
            { label: 'Solve for Tomorrow', href: 'https://solve.mit.edu/samsungsolvefortomorrow', external: true },
        ],
    },
    {
        title: 'Legal',
        links: [
            { label: 'Privacy Policy', href: '/privacy' },
            { label: 'Terms & Conditions', href: '/terms' },
        ],
    },
]

export function SiteFooter() {
    return (
        <footer id="about" className="scroll-mt-24 border-t bg-card">
            <div className="mx-auto max-w-6xl px-6 pt-16">
                <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
                    <div>
                        <Link href="/" aria-label="Iris home" className="flex w-fit items-center gap-2">
                            <Logo className="h-9 w-24" />
                            <span className="text-2xl font-bold tracking-tight">iris</span>
                        </Link>
                        <p className="mt-3 text-sm text-muted-foreground">
                            Eye checks by phone. A student project for <span className="font-medium text-foreground">Samsung Solve for Tomorrow</span>.
                        </p>
                        <div className="mt-6 flex gap-3">
                            <IconButton label="Ask our AI about Iris" onClick={openChat}>
                                <MessageCircle className="size-4" />
                            </IconButton>
                            <IconButton label="Read the research" href="/research">
                                <BookOpen className="size-4" />
                            </IconButton>
                            <IconButton label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                                <ArrowUp className="size-4" />
                            </IconButton>
                        </div>
                    </div>

                    {columns.map((col) => (
                        <div key={col.title}>
                            <h3 className="text-xs font-semibold uppercase tracking-widest">{col.title}</h3>
                            <ul className="mt-5 space-y-3 text-sm">
                                {col.links.map((link) => (
                                    <li key={link.label}>
                                        {link.onClick ? (
                                            <button onClick={link.onClick} className="text-muted-foreground transition-colors hover:text-foreground">
                                                {link.label}
                                            </button>
                                        ) : link.external ? (
                                            <a
                                                href={link.href}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground">
                                                {link.label}
                                                <ArrowUpRight className="size-3.5" />
                                            </a>
                                        ) : (
                                            <Link href={link.href} className="text-muted-foreground transition-colors hover:text-foreground">
                                                {link.label}
                                            </Link>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <p className="mt-12 max-w-3xl text-xs text-muted-foreground">
                    Iris is a student research prototype. It is not a medical device and does not diagnose any condition. If you&apos;re worried about
                    your eyes or your health, talk to a doctor.
                </p>

                <div className="mt-8 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                <div className="flex flex-col items-start justify-between gap-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center">
                    <p className="inline-flex flex-wrap items-center gap-1.5">
                        © 2026 Iris. Built with
                        <Heart className="size-4 fill-foreground text-foreground" aria-label="love" />
                        for Samsung Solve for Tomorrow.
                    </p>
                    <div className="flex items-center gap-2">
                        <span className="rounded-full border px-3 py-1 font-mono text-xs">{SITE_VERSION}</span>
                        <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-foreground">
                            <span className="relative flex size-2">
                                <span className="absolute inline-flex size-full animate-ping rounded-full bg-foreground/60 motion-reduce:animate-none" />
                                <span className="relative inline-flex size-2 rounded-full bg-foreground" />
                            </span>
                            Prototype
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    )
}

function IconButton({
    label,
    href,
    onClick,
    children,
}: {
    label: string
    href?: string
    onClick?: () => void
    children: React.ReactNode
}) {
    const cls =
        'flex size-11 items-center justify-center rounded-xl border bg-background text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground hover:text-foreground'
    return href ? (
        <Link href={href} aria-label={label} title={label} className={cls}>
            {children}
        </Link>
    ) : (
        <button onClick={onClick} aria-label={label} title={label} className={cls}>
            {children}
        </button>
    )
}
