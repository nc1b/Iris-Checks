import { SiteFooter } from '@/components/blocks/site-footer'
import { SiteNav } from '@/components/blocks/site-nav'

export type LegalSection = { heading: string; body: React.ReactNode }

export function LegalPage({
    title,
    updated,
    intro,
    sections,
}: {
    title: string
    updated: string
    intro: React.ReactNode
    sections: LegalSection[]
}) {
    return (
        <>
            <SiteNav />
            <main className="flex-1">
                <article className="mx-auto max-w-3xl px-6 pb-24 pt-36">
                    <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Legal</p>
                    <h1 className="mt-3 text-4xl font-bold md:text-5xl">{title}</h1>
                    <p className="mt-4 text-sm text-muted-foreground">Last updated: {updated}</p>
                    <div className="mt-8 text-muted-foreground">{intro}</div>

                    <nav aria-label="On this page" className="mt-10 rounded-2xl border bg-card p-5">
                        <p className="text-xs font-semibold uppercase tracking-widest">On this page</p>
                        <ol className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
                            {sections.map((s, i) => (
                                <li key={s.heading}>
                                    <a href={`#section-${i + 1}`} className="text-muted-foreground hover:text-foreground">
                                        {i + 1}. {s.heading}
                                    </a>
                                </li>
                            ))}
                        </ol>
                    </nav>

                    <div className="mt-12 space-y-10">
                        {sections.map((s, i) => (
                            <section key={s.heading} id={`section-${i + 1}`} className="scroll-mt-28">
                                <h2 className="text-xl font-semibold">
                                    {i + 1}. {s.heading}
                                </h2>
                                <div className="mt-3 space-y-3 leading-relaxed text-muted-foreground [&_a]:text-foreground [&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground [&_ul]:space-y-1.5">
                                    {s.body}
                                </div>
                            </section>
                        ))}
                    </div>
                </article>
            </main>
            <SiteFooter />
        </>
    )
}
