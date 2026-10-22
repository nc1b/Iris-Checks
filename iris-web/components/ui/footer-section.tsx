"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowUp, BookOpen, HeartHandshake, MessageCircle, Moon, Send, Sun, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Logo } from "@/components/blocks/site-nav"
import { SectionLink } from "@/components/blocks/section-link"
import { openChat } from "@/lib/chat-events"
import { setTheme, useIsDark } from "@/lib/theme"
import { THEME_KEY } from "@/lib/theme-script"

export const SITE_VERSION = "v0.5.0"

const quickLinks = [
  { label: "The three checks", section: "checks" },
  { label: "How it works", section: "how-it-works" },
  { label: "Roadmap", section: "roadmap" },
  { label: "Research", href: "/research" },
  { label: "Team (coming soon)", href: "/team" },
  { label: "Supporters", section: "supporters" },
  { label: "FAQ", section: "faq" },
]

/** Everything Iris keeps in this browser. Listed in the Privacy Policy. */
const STORAGE_KEYS = [THEME_KEY, "iris-chat-messages", "iris-chat-position"]

/**
 * Site footer, adapted from the footer-section block:
 * - "Stay connected" newsletter → ask-the-AI box (there's no mailing list yet)
 * - "Contact us" → honest "coming soon" (no made-up address)
 * - social buttons → site actions (there are no social accounts yet)
 * - dark mode switch wired to the site-wide theme
 * - "Cookie settings" clears what Iris saved in this browser
 */
function Footerdemo() {
  const isDarkMode = useIsDark()
  const [question, setQuestion] = React.useState("")

  const clearSavedData = () => {
    if (!window.confirm("Clear everything Iris saved in this browser (theme choice, chat history and chat position)?")) return
    for (const key of STORAGE_KEYS) {
      try {
        localStorage.removeItem(key)
      } catch {
        // ignore
      }
    }
    window.location.reload()
  }

  const actions = [
    { label: "Ask our AI assistant", icon: MessageCircle, onClick: () => openChat() },
    { label: "Read the research", icon: BookOpen, href: "/research" },
    { label: "Become a supporter", icon: HeartHandshake, section: "supporters" },
    { label: "Back to top", icon: ArrowUp, onClick: () => window.scrollTo({ top: 0, behavior: "smooth" }) },
  ]

  return (
    <footer className="relative overflow-hidden border-t bg-background text-foreground transition-colors duration-300">
      <div className="container mx-auto max-w-6xl px-6 py-14 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <h2 className="mb-4 text-3xl font-bold tracking-tight">Have a question?</h2>
            <p className="mb-6 text-muted-foreground">Ask our AI assistant anything about Iris and the research behind it.</p>
            <form
              className="relative"
              onSubmit={(e) => {
                e.preventDefault()
                const q = question.trim()
                openChat(q || undefined)
                setQuestion("")
              }}>
              <Label htmlFor="footer-question" className="sr-only">
                Your question
              </Label>
              <Input
                id="footer-question"
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                maxLength={800}
                placeholder="e.g. How will the scan work?"
                className="h-11 rounded-full pr-12 backdrop-blur-sm"
              />
              <Button
                type="submit"
                size="icon"
                className="absolute right-1.5 top-1.5 h-8 w-8 rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105">
                <Send className="h-4 w-4" />
                <span className="sr-only">Ask</span>
              </Button>
            </form>
            <div className="pointer-events-none absolute -right-4 top-0 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
          </div>

          <div>
            <h3 className="mb-4 text-lg font-semibold">Quick Links</h3>
            <nav className="space-y-2 text-sm">
              {quickLinks.map((l) =>
                l.href ? (
                  <Link key={l.label} href={l.href} className="block text-muted-foreground transition-colors hover:text-foreground">
                    {l.label}
                  </Link>
                ) : (
                  <SectionLink key={l.label} section={l.section!} className="block text-muted-foreground transition-colors hover:text-foreground">
                    {l.label}
                  </SectionLink>
                ),
              )}
            </nav>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-semibold">Contact Us</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Team contact details are coming soon.</p>
              <p>Want to support Iris or test it when it&apos;s ready? We&apos;d love to hear from you.</p>
              <button onClick={() => openChat()} className="font-medium text-foreground underline-offset-4 hover:underline">
                Ask the assistant in the meantime →
              </button>
            </div>
          </div>

          <div className="relative">
            <h3 className="mb-4 text-lg font-semibold">Explore</h3>
            <TooltipProvider delayDuration={150}>
              <div className="mb-6 flex flex-wrap gap-3">
                {actions.map(({ label, icon: Icon, href, section, onClick }) => (
                  <Tooltip key={label}>
                    <TooltipTrigger asChild>
                      {href ? (
                        <Button asChild variant="outline" size="icon" className="rounded-full">
                          <Link href={href} aria-label={label}>
                            <Icon className="h-4 w-4" />
                          </Link>
                        </Button>
                      ) : section ? (
                        <Button asChild variant="outline" size="icon" className="rounded-full">
                          <SectionLink section={section} aria-label={label}>
                            <Icon className="h-4 w-4" />
                          </SectionLink>
                        </Button>
                      ) : (
                        <Button variant="outline" size="icon" className="rounded-full" onClick={onClick} aria-label={label}>
                          <Icon className="h-4 w-4" />
                        </Button>
                      )}
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{label}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
            <div className="flex items-center space-x-2">
              <Sun className="h-4 w-4" />
              <Switch id="dark-mode" checked={isDarkMode} onCheckedChange={(on) => setTheme(on ? "dark" : "light")} />
              <Moon className="h-4 w-4" />
              <Label htmlFor="dark-mode" className="sr-only">
                Toggle dark mode
              </Label>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Social accounts are coming soon.</p>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 text-center md:flex-row">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Logo className="h-6 w-14" />
            <p>© 2026 Iris. All rights reserved.</p>
            <span className="rounded-full border px-2 py-0.5 font-mono text-[11px]">{SITE_VERSION}</span>
          </div>
          <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
            <Link href="/privacy" className="transition-colors hover:text-muted-foreground">
              Privacy Policy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-muted-foreground">
              Terms of Service
            </Link>
            <button onClick={clearSavedData} className="inline-flex items-center gap-1.5 transition-colors hover:text-muted-foreground">
              <Trash2 className="h-3.5 w-3.5" /> Clear saved data
            </button>
          </nav>
        </div>
      </div>
    </footer>
  )
}

export { Footerdemo }
