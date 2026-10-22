'use client'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'

// The chat reads its saved position and messages from localStorage, so it only renders in the browser.
const Chat = dynamic(() => import('./chat-widget'), { ssr: false })

// Full-screen sign-in pages keep the focus on the form.
const HIDDEN_ON = ['/sign-in', '/sign-up', '/sso-callback']

export function ChatWidget() {
    const pathname = usePathname()
    if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null
    return <Chat />
}
