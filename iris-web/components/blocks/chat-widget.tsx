'use client'
import { ArrowUp, GripHorizontal, MessageCircle, RotateCcw, Sparkles, X } from 'lucide-react'
import Link from 'next/link'
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

import { OPEN_CHAT_EVENT } from '@/lib/chat-events'

type Message = { role: 'user' | 'assistant'; content: string; error?: boolean }
type Pos = { x: number; y: number }

const MESSAGES_KEY = 'iris-chat-messages'
const POS_KEY = 'iris-chat-position'
const MAX_SAVED = 40
const BUTTON = 56
const MARGIN = 12

const suggestions = ['What is Iris?', 'How will the eye check work?', 'Why diabetes?', 'Is my data private?']

const greeting: Message = {
    role: 'assistant',
    content: "Hi! I'm the Iris assistant. Ask me anything about the project, how the eye check will work, or the research behind it.",
}

function load<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key)
        return raw ? (JSON.parse(raw) as T) : fallback
    } catch {
        return fallback
    }
}

function save(key: string, value: unknown) {
    try {
        localStorage.setItem(key, JSON.stringify(value))
    } catch {
        // Storage full or blocked: the chat still works, it just won't be remembered.
    }
}

function clamp(p: Pos): Pos {
    return {
        x: Math.min(Math.max(MARGIN, p.x), window.innerWidth - BUTTON - MARGIN),
        y: Math.min(Math.max(MARGIN, p.y), window.innerHeight - BUTTON - MARGIN),
    }
}

function defaultPos(): Pos {
    return { x: window.innerWidth - BUTTON - 20, y: window.innerHeight - BUTTON - 20 }
}

/** **bold**, *italic* and site links like /privacy. Everything else stays plain text (no HTML). */
function inline(text: string): ReactNode[] {
    return text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|(?<![\w/])\/(?:privacy|terms|research)\b)/g).map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>
        if (/^\/(privacy|terms|research)$/.test(part))
            return (
                <Link key={i} href={part} className="underline underline-offset-2 hover:opacity-70">
                    {part}
                </Link>
            )
        return <Fragment key={i}>{part}</Fragment>
    })
}

/** Small, safe markdown subset for replies: paragraphs, "- " / "1. " lists, bold, italic. */
function Markdown({ text }: { text: string }) {
    const blocks: ReactNode[] = []
    let list: { ordered: boolean; items: string[] } | null = null
    const flush = () => {
        if (!list) return
        const Tag = list.ordered ? 'ol' : 'ul'
        blocks.push(
            <Tag key={blocks.length} className={cn('space-y-1 pl-5', list.ordered ? 'list-decimal' : 'list-disc')}>
                {list.items.map((item, i) => (
                    <li key={i}>{inline(item)}</li>
                ))}
            </Tag>,
        )
        list = null
    }
    for (const raw of text.replace(/\r/g, '').split('\n')) {
        const line = raw.trim()
        const bullet = line.match(/^[-*•]\s+(.*)$/)
        const numbered = line.match(/^\d+[.)]\s+(.*)$/)
        if (bullet || numbered) {
            const ordered = !!numbered
            if (list && list.ordered !== ordered) flush()
            list ??= { ordered, items: [] }
            list.items.push((bullet ?? numbered)![1])
            continue
        }
        flush()
        if (!line) continue
        blocks.push(<p key={blocks.length}>{inline(line.replace(/^#+\s*/, ''))}</p>)
    }
    flush()
    return <div className="space-y-2">{blocks}</div>
}

/**
 * Floating "ask about the project" chat. Drag the round button (or the panel's
 * header) anywhere on screen. The conversation and the position are saved in this
 * browser's localStorage. Rendered client-only (see chat-widget-loader.tsx).
 */
export default function ChatWidget() {
    const [open, setOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>(() => {
        const saved = load<Message[]>(MESSAGES_KEY, [])
        return Array.isArray(saved) && saved.length ? saved.filter((m) => m && typeof m.content === 'string') : [greeting]
    })
    const [pos, setPos] = useState<Pos>(() => {
        const saved = load<Pos | null>(POS_KEY, null)
        return clamp(saved && Number.isFinite(saved.x) && Number.isFinite(saved.y) ? saved : defaultPos())
    })
    const [viewport, setViewport] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
    const [dragging, setDragging] = useState(false)
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const listRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const drag = useRef<{ startX: number; startY: number; origin: Pos; moved: boolean } | null>(null)
    const messagesRef = useRef(messages)
    // Bumped by "New chat" so a reply that arrives afterwards is dropped instead of reviving the old chat.
    const chatId = useRef(0)
    const firstScroll = useRef(true)

    useEffect(() => {
        messagesRef.current = messages
        save(MESSAGES_KEY, messages.slice(-MAX_SAVED))
    }, [messages])

    // Remember where the widget was dropped.
    useEffect(() => {
        if (!dragging) save(POS_KEY, pos)
    }, [pos, dragging])

    // Keep the widget on screen when the window size changes.
    useEffect(() => {
        const onResize = () => {
            setViewport({ w: window.innerWidth, h: window.innerHeight })
            setPos((p) => clamp(p))
        }
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    }, [])

    useEffect(() => {
        if (!open) return
        inputRef.current?.focus({ preventScroll: true })
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [open])

    // Jump to the bottom when opened, then scroll smoothly for new messages.
    useEffect(() => {
        const el = listRef.current
        if (!el || !open) return
        el.scrollTo({ top: el.scrollHeight, behavior: firstScroll.current ? 'auto' : 'smooth' })
        firstScroll.current = false
    }, [messages, loading, open])

    // Grow the textarea with its text (up to max-h).
    useLayoutEffect(() => {
        const el = inputRef.current
        if (!el) return
        el.style.height = 'auto'
        el.style.height = `${el.scrollHeight}px`
    }, [input])

    const send = useCallback(async (text: string, history?: Message[]) => {
        const content = text.trim().slice(0, 800)
        if (!content) return
        const id = chatId.current
        const next: Message[] = [...(history ?? messagesRef.current), { role: 'user', content }]
        setMessages(next)
        setInput('')
        setLoading(true)
        let reply: Message
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Send only the recent conversation, without the canned greeting or error notes.
                body: JSON.stringify({
                    messages: next
                        .filter((m) => m.content !== greeting.content && !m.error)
                        .map(({ role, content }) => ({ role, content }))
                        .slice(-10),
                }),
            })
            const data = (await res.json()) as { text?: string; source?: string }
            const failed = !res.ok || data.source === 'error'
            reply = { role: 'assistant', content: data.text || "Sorry, I couldn't answer that right now.", error: failed || undefined }
        } catch {
            reply = { role: 'assistant', content: "I couldn't reach the assistant. Check your connection and try again.", error: true }
        }
        if (id !== chatId.current) return
        setMessages([...next, reply])
        setLoading(false)
    }, [])

    useEffect(() => {
        const onOpen = (e: Event) => {
            setOpen(true)
            const q = (e as CustomEvent<{ question?: string }>).detail?.question
            if (q) send(q)
        }
        window.addEventListener(OPEN_CHAT_EVENT, onOpen)
        return () => window.removeEventListener(OPEN_CHAT_EVENT, onOpen)
    }, [send])

    // ----- dragging -----
    const onPointerDown = (e: React.PointerEvent) => {
        if (e.button !== 0) return
        drag.current = { startX: e.clientX, startY: e.clientY, origin: pos, moved: false }
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    }
    const onPointerMove = (e: React.PointerEvent) => {
        const d = drag.current
        if (!d) return
        const dx = e.clientX - d.startX
        const dy = e.clientY - d.startY
        if (!d.moved && Math.hypot(dx, dy) < 5) return
        if (!d.moved) setDragging(true)
        d.moved = true
        setPos(clamp({ x: d.origin.x + dx, y: d.origin.y + dy }))
    }
    const endDrag = (toggle: boolean) => () => {
        const d = drag.current
        drag.current = null
        setDragging(false)
        if (!d) return
        if (!d.moved && toggle) setOpen((o) => !o)
    }

    const resetChat = () => {
        chatId.current++
        setLoading(false)
        setMessages([greeting])
        setInput('')
        inputRef.current?.focus({ preventScroll: true })
    }

    const retry = () => {
        const all = messagesRef.current
        const lastUser = all.findLastIndex((m) => m.role === 'user')
        if (lastUser < 0 || loading) return
        send(all[lastUser].content, all.slice(0, lastUser))
    }

    // ----- panel placement: opens toward the side of the screen with more room -----
    const panelW = Math.min(380, viewport.w - MARGIN * 2)
    const onRight = pos.x + BUTTON / 2 > viewport.w / 2
    const roomAbove = pos.y - MARGIN * 2
    const roomBelow = viewport.h - (pos.y + BUTTON) - MARGIN * 2
    const below = roomBelow > roomAbove
    // Never cover the button: shrink the panel to the space on its side.
    const panelH = Math.max(260, Math.min(560, below ? roomBelow : roomAbove))
    const panelLeft = Math.min(Math.max(MARGIN, onRight ? pos.x + BUTTON - panelW : pos.x), viewport.w - panelW - MARGIN)
    const panelTop = below ? pos.y + BUTTON + MARGIN : Math.max(MARGIN, pos.y - panelH - MARGIN)
    const origin = `${onRight ? 'right' : 'left'} ${below ? 'top' : 'bottom'}`
    const lastIsError = messages[messages.length - 1]?.error && !loading

    return (
        <>
            <div
                role="dialog"
                aria-label="Ask about Iris"
                inert={!open}
                style={{ left: panelLeft, top: panelTop, width: panelW, height: panelH, transformOrigin: origin }}
                className={cn(
                    'fixed z-40 flex flex-col overflow-hidden rounded-[1.75rem] border bg-background/95 shadow-2xl shadow-black/20 ring-1 ring-black/5 backdrop-blur-xl dark:shadow-black/60 dark:ring-white/5',
                    !dragging && 'transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none',
                    open ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-2 scale-95 opacity-0',
                )}>
                {/* Header (drag handle) */}
                <div
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={endDrag(false)}
                    onPointerCancel={endDrag(false)}
                    className={cn('relative flex touch-none select-none items-center gap-3 px-4 pb-3 pt-4', dragging ? 'cursor-grabbing' : 'cursor-grab')}>
                    <GripHorizontal aria-hidden className="absolute left-1/2 top-1 size-4 -translate-x-1/2 text-muted-foreground/50" />
                    <span className="relative flex size-10 shrink-0 items-center justify-center rounded-2xl bg-foreground text-background">
                        <Sparkles className="size-[18px]" />
                        <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-background bg-foreground">
                            <span className="absolute inset-0 animate-ping rounded-full bg-foreground/60 motion-reduce:animate-none" />
                        </span>
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-tight">Iris assistant</p>
                        <p className="truncate text-xs text-muted-foreground">{loading ? 'Typing…' : 'Answers about the project · drag to move'}</p>
                    </div>
                    <div className="flex items-center gap-0.5" onPointerDown={(e) => e.stopPropagation()}>
                        <button
                            onClick={resetChat}
                            aria-label="Start a new chat"
                            title="New chat"
                            className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                            <RotateCcw className="size-4" />
                        </button>
                        <button
                            onClick={() => setOpen(false)}
                            aria-label="Close chat"
                            title="Close (Esc)"
                            className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                            <X className="size-4" />
                        </button>
                    </div>
                </div>
                <div className="mx-4 h-px bg-border" />

                {/* Messages */}
                <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4" aria-live="polite">
                    {messages.map((m, i) =>
                        m.role === 'user' ? (
                            <div key={i} className="flex justify-end animate-in fade-in slide-in-from-bottom-1 duration-300">
                                <p className="max-w-[82%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-foreground px-3.5 py-2 text-sm leading-relaxed text-background">
                                    {m.content}
                                </p>
                            </div>
                        ) : (
                            <div key={i} className="flex gap-2.5 animate-in fade-in slide-in-from-bottom-1 duration-300">
                                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border bg-background">
                                    <Sparkles className="size-3" />
                                </span>
                                <div
                                    className={cn(
                                        'min-w-0 max-w-[85%] break-words rounded-2xl rounded-tl-md px-3.5 py-2.5 text-sm leading-relaxed',
                                        m.error ? 'border border-dashed text-muted-foreground' : 'bg-muted',
                                    )}>
                                    <Markdown text={m.content} />
                                </div>
                            </div>
                        ),
                    )}

                    {loading && (
                        <div className="flex gap-2.5" aria-label="The assistant is typing">
                            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border bg-background">
                                <Sparkles className="size-3" />
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-2xl rounded-tl-md bg-muted px-4 py-3">
                                {[0, 150, 300].map((d) => (
                                    <span key={d} className="size-1.5 animate-bounce rounded-full bg-muted-foreground motion-reduce:animate-none" style={{ animationDelay: `${d}ms` }} />
                                ))}
                            </span>
                        </div>
                    )}

                    {lastIsError && (
                        <div className="pl-8">
                            <button onClick={retry} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors hover:bg-accent">
                                <RotateCcw className="size-3" /> Try again
                            </button>
                        </div>
                    )}

                    {messages.length === 1 && !loading && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                            {suggestions.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => send(s)}
                                    className="rounded-xl border px-3 py-2 text-left text-xs leading-snug text-muted-foreground transition-colors hover:border-foreground/40 hover:bg-accent hover:text-foreground">
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Composer */}
                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        if (!loading) send(input)
                    }}
                    className="px-3 pb-3">
                    <div className="flex items-end gap-2 rounded-2xl border bg-muted/40 py-1.5 pl-3.5 pr-1.5 transition-colors focus-within:border-foreground/30 focus-within:bg-background">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                                    e.preventDefault()
                                    if (!loading) send(input)
                                }
                            }}
                            rows={1}
                            maxLength={800}
                            placeholder="Ask about Iris…"
                            aria-label="Your question"
                            className="max-h-28 min-h-8 flex-1 resize-none bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || loading}
                            aria-label="Send"
                            className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-foreground text-background transition-all hover:opacity-80 disabled:scale-90 disabled:opacity-25">
                            <ArrowUp className="size-4" />
                        </button>
                    </div>
                    <p className="mt-2 px-1 text-center text-[10.5px] leading-snug text-muted-foreground">
                        AI can make mistakes. Not medical advice. Saved in this browser ·{' '}
                        <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
                            Privacy
                        </Link>
                    </p>
                </form>
            </div>

            <button
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag(true)}
                onPointerCancel={endDrag(false)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setOpen((o) => !o)
                    }
                }}
                style={{ left: pos.x, top: pos.y, width: BUTTON, height: BUTTON }}
                aria-label={open ? 'Close chat' : 'Ask about Iris (drag to move)'}
                aria-expanded={open}
                title="Ask about Iris · drag to move"
                className={cn(
                    'fixed z-40 flex touch-none select-none items-center justify-center rounded-full bg-foreground text-background shadow-xl shadow-black/25 ring-4 ring-background/60',
                    'animate-in fade-in zoom-in-50 [animation-delay:600ms] [animation-duration:500ms] [animation-fill-mode:both] motion-reduce:animate-none',
                    dragging ? 'cursor-grabbing scale-110' : 'cursor-grab transition-transform duration-200 hover:scale-105 active:scale-95',
                )}>
                <MessageCircle className={cn('absolute size-6 transition-all duration-200', open ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100')} />
                <X className={cn('absolute size-6 transition-all duration-200', open ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0')} />
            </button>
        </>
    )
}
