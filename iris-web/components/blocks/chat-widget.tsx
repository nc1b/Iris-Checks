'use client'
import { Bot, GripHorizontal, Loader2, MessageCircle, RotateCcw, SendHorizontal, X } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

import { OPEN_CHAT_EVENT } from '@/lib/chat-events'

type Message = { role: 'user' | 'assistant'; content: string }
type Pos = { x: number; y: number }

const MESSAGES_KEY = 'iris-chat-messages'
const POS_KEY = 'iris-chat-position'
const MAX_SAVED = 40
const BUTTON = 56
const MARGIN = 12

const suggestions = ['What is Iris?', 'How will the eye check work?', 'Is my data private?', 'When can I try it?']

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

/**
 * Floating "ask about the project" chat. Drag the round button (or the panel's
 * header) anywhere on screen. The conversation and the position are saved in this
 * browser's localStorage. Rendered client-only (see chat-widget-loader.tsx).
 */
export default function ChatWidget() {
    const [open, setOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>(() => {
        const saved = load<Message[]>(MESSAGES_KEY, [])
        return Array.isArray(saved) && saved.length ? saved : [greeting]
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
        if (open) inputRef.current?.focus({ preventScroll: true })
    }, [open])

    useEffect(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
    }, [messages, loading, open])

    const send = useCallback(async (text: string) => {
        const content = text.trim().slice(0, 800)
        if (!content) return
        const next: Message[] = [...messagesRef.current, { role: 'user', content }]
        setMessages(next)
        setInput('')
        setLoading(true)
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Send only the recent conversation, without the canned greeting.
                body: JSON.stringify({ messages: next.filter((m) => m.content !== greeting.content).slice(-10) }),
            })
            const data = (await res.json()) as { text?: string }
            setMessages([...next, { role: 'assistant', content: data.text || "Sorry, I couldn't answer that right now." }])
        } catch {
            setMessages([...next, { role: 'assistant', content: "Sorry, I couldn't reach the assistant. Please try again in a moment." }])
        } finally {
            setLoading(false)
        }
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
        setMessages([greeting])
        setInput('')
    }

    // ----- panel placement: opens toward the side of the screen with more room -----
    const panelW = Math.min(368, viewport.w - MARGIN * 2)
    const onRight = pos.x + BUTTON / 2 > viewport.w / 2
    const roomAbove = pos.y - MARGIN * 2
    const roomBelow = viewport.h - (pos.y + BUTTON) - MARGIN * 2
    const below = roomBelow > roomAbove
    // Never cover the button: shrink the panel to the space on its side.
    const panelH = Math.max(240, Math.min(540, below ? roomBelow : roomAbove))
    const panelLeft = Math.min(Math.max(MARGIN, onRight ? pos.x + BUTTON - panelW : pos.x), viewport.w - panelW - MARGIN)
    const panelTop = below ? pos.y + BUTTON + MARGIN : Math.max(MARGIN, pos.y - panelH - MARGIN)
    const origin = `${onRight ? 'right' : 'left'} ${below ? 'top' : 'bottom'}`

    return (
        <>
            <div
                role="dialog"
                aria-label="Ask about Iris"
                inert={!open}
                style={{ left: panelLeft, top: panelTop, width: panelW, height: panelH, transformOrigin: origin }}
                className={cn(
                    'fixed z-40 flex flex-col overflow-hidden rounded-3xl border bg-background shadow-2xl shadow-black/20 dark:shadow-black/60',
                    !dragging && 'transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none',
                    open ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0',
                )}>
                <div
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={endDrag(false)}
                    onPointerCancel={endDrag(false)}
                    className={cn('flex touch-none select-none items-center justify-between border-b px-4 py-3', dragging ? 'cursor-grabbing' : 'cursor-grab')}>
                    <div className="flex items-center gap-3">
                        <span className="flex size-9 items-center justify-center rounded-full bg-foreground text-background">
                            <Bot className="size-4" />
                        </span>
                        <div>
                            <p className="text-sm font-semibold">Ask about Iris</p>
                            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                <GripHorizontal className="size-3" /> Drag to move · AI can make mistakes
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center" onPointerDown={(e) => e.stopPropagation()}>
                        <button
                            onClick={resetChat}
                            aria-label="Start a new chat"
                            title="New chat"
                            className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground">
                            <RotateCcw className="size-4" />
                        </button>
                        <button
                            onClick={() => setOpen(false)}
                            aria-label="Close chat"
                            className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground">
                            <X className="size-4" />
                        </button>
                    </div>
                </div>

                <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
                    {messages.map((m, i) => (
                        <div key={i} className={cn('flex animate-in fade-in slide-in-from-bottom-1 duration-300', m.role === 'user' ? 'justify-end' : 'justify-start')}>
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
                        if (!loading) send(input)
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
                                    if (!loading) send(input)
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
                        Not medical advice. Don&apos;t share personal or health details. Chats are saved in this browser. See our{' '}
                        <Link href="/privacy" className="underline hover:text-foreground">
                            Privacy Policy
                        </Link>
                        .
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
                    'fixed z-40 flex touch-none select-none items-center justify-center rounded-full bg-foreground text-background shadow-xl shadow-black/25',
                    'animate-in fade-in zoom-in-50 [animation-delay:600ms] [animation-duration:500ms] [animation-fill-mode:both] motion-reduce:animate-none',
                    dragging ? 'cursor-grabbing scale-110' : 'cursor-grab transition-transform duration-200 hover:scale-105 active:scale-95',
                )}>
                <MessageCircle className={cn('absolute size-6 transition-all duration-200', open ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100')} />
                <X className={cn('absolute size-6 transition-all duration-200', open ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0')} />
            </button>
        </>
    )
}
