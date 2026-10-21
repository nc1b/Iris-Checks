import Link from 'next/link'
import { Logo } from '@/components/blocks/site-nav'

export function SiteFooter() {
    return (
        <footer id="about" className="scroll-mt-24 border-t">
            <div className="mx-auto grid max-w-5xl gap-8 px-6 py-12 text-sm text-muted-foreground md:grid-cols-[1fr_auto]">
                <div>
                    <div className="flex items-center gap-2 text-foreground">
                        <Logo className="h-7 w-[4.5rem]" />
                        <span className="text-base font-semibold tracking-tight">iris</span>
                    </div>
                    <p className="mt-4 max-w-xl">
                        Iris is a student project for Samsung Solve for Tomorrow 2026–27. It is not a medical device and does not diagnose any
                        condition. If you&apos;re worried about your eyes or your health, talk to a doctor.
                    </p>
                </div>
                <ul className="flex gap-6 md:flex-col md:gap-2">
                    <li><Link href="/#how-it-works" className="hover:text-foreground">How it works</Link></li>
                    <li><Link href="/research" className="hover:text-foreground">Research</Link></li>
                    <li><Link href="/#supporters" className="hover:text-foreground">Supporters</Link></li>
                </ul>
            </div>
        </footer>
    )
}
