'use client'
import { Bot, Loader2, MessageCircle, SendHorizontal, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export const OPEN_CHAT_EVENT = 'iris:open-chat'

type Message = { role: 'user' | 'assistant'; content: string }

const suggestions = ['What is Iris?', 'How will the eye check work?', 'Is my data private?', 'When can I try it?']

const greeting: Message = {
    role: 'assistant',
    content: "Hi! I'm the Iris assistant. Ask me anything about the project, how the eye check will work, or the research behind it.",
}

/**
 * Floating "ask about the project" chat in the bottom-right corner.
 * Messages go to /api/chat, which calls the Hack Club AI proxy.
 * The conversation lives only in this tab's memory.
 */
export function ChatWidget() {
    const [open, setOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([greeting])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const listRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        const onOpen = () => setOpen(true)
        window.addEventListener(OPEN_CHAT_EVENT, onOpen)
        return () => window.removeEventListener(OPEN_CHAT_EVENT, onOpen)
    }, [])

    useEffect(() => {
        if (open) inputRef.current?.focus()
    }, [open])

    useEffect(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
    }, [messages, loading])

    const send = async (text: string) => {
        const content = text.trim().slice(0, 800)
        if (!content || loading) return
        const next: Message[] = [...messages, { role: 'user', content }]
        setMessages(next)
        setInput('')
        setLoading(true)
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Skip the canned greeting; send only the recent conversation.
                body: JSON.stringify({ messages: next.slice(1).slice(-10) }),
            })
            const data = (await res.json()) as { text?: string }
            setMessages([...next, { role: 'assistant', content: data.text || "Sorry, I couldn't answer that right now." }])
        } catch {
            setMessages([...next, { role: 'assistant', content: "Sorry, I couldn't reach the assistant. Please try again in a moment." }])
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
            <div
                role="dialog"
                aria-label="Ask about Iris"
                inert={!open}
                className={cn(
                    'flex h-[min(34rem,calc(100dvh-7rem))] w-[min(23rem,calc(100vw-2.5rem))] origin-bottom-right flex-col overflow-hidden rounded-3xl border bg-background shadow-2xl shadow-black/20 transition-all duration-300 ease-out motion-reduce:transition-none',
                    open ? 'pointer-events-auto scale-100 opacity-100' : 'pointer-events-none translate-y-4 scale-95 opacity-0',
                )}>
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <div className="flex items-center gap-3">
                        <span className="flex size-9 items-center justify-center rounded-full bg-foreground text-background">
                            <Bot className="size-4" />
                        </span>
                        <div>
                            <p className="text-sm font-semibold">Ask about Iris</p>
                            <p className="text-xs text-muted-foreground">AI assistant · may make mistakes</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setOpen(false)}
                        aria-label="Close chat"
                        className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground">
                        <X className="size-4" />
                    </button>
                </div>

                <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                    {messages.map((m, i) => (
                        <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                            <p
                                className={cn(
                                    'max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                                    m.role === 'user' ? 'rounded-br-md bg-foreground text-background' : 'rounded-bl-md bg-muted',
                                )}>
                                {m.content}
                            </p>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <span className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md bg-muted px-3.5 py-2 text-sm text-muted-foreground">
                                <Loader2 className="size-3.5 animate-spin" /> Thinking…
                            </span>
                        </div>
                    )}
                    {messages.length === 1 && !loading && (
                        <div className="flex flex-wrap gap-2 pt-1">
                            {suggestions.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => send(s)}
                                    className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground hover:text-foreground">
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        send(input)
                    }}
                    className="border-t p-3">
                    <div className="flex items-end gap-2 rounded-2xl border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    send(input)
                                }
                            }}
                            rows={1}
                            maxLength={800}
                            placeholder="Ask a question…"
                            aria-label="Your question"
                            className="max-h-28 flex-1 resize-none bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || loading}
                            aria-label="Send"
                            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity disabled:opacity-30">
                            <SendHorizontal className="size-4" />
                        </button>
                    </div>
                    <p className="mt-2 px-1 text-[11px] text-muted-foreground">
                        Not medical advice. Don&apos;t share personal or health details. See our{' '}
                        <Link href="/privacy" className="underline hover:text-foreground">
                            Privacy Policy
                        </Link>
                        .
                    </p>
                </form>
            </div>

            <button
                onClick={() => setOpen(!open)}
                aria-label={open ? 'Close chat' : 'Ask about Iris'}
                aria-expanded={open}
                className="group flex size-14 items-center justify-center rounded-full bg-foreground text-background shadow-xl shadow-black/20 transition-transform duration-200 hover:scale-105 active:scale-95 animate-in fade-in zoom-in-50 [animation-delay:800ms] [animation-duration:500ms] [animation-fill-mode:both] motion-reduce:animate-none">
                <MessageCircle className={cn('absolute size-6 transition-all duration-200', open ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100')} />
                <X className={cn('absolute size-6 transition-all duration-200', open ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0')} />
            </button>
        </div>
    )
}
