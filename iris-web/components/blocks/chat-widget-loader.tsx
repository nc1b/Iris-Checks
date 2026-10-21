'use client'
import dynamic from 'next/dynamic'

// The chat reads its saved position and messages from localStorage, so it only renders in the browser.
export const ChatWidget = dynamic(() => import('./chat-widget'), { ssr: false })
