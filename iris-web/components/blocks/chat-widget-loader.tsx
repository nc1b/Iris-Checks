'use client'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'

const Chat = dynamic(() => import('./chat-widget'), { ssr: false })

const HIDDEN_ON = ['/sign-in', '/sign-up', '/sso-callback']

export function ChatWidget() {
    const pathname = usePathname()
    if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null
    return <Chat />
}
