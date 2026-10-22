'use client'
import { useLayoutEffect, useSyncExternalStore } from 'react'

/**
 * Light/dark theme. The choice is saved in localStorage ("iris-theme"); with no
 * saved choice the site follows the device setting. An inline script in the root
 * layout applies the class before the first paint, so there's no flash.
 */

import { THEME_KEY } from './theme-script'

const EVENT = 'iris:theme'

function systemPrefersDark() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function readSaved(): 'light' | 'dark' | null {
    try {
        const t = localStorage.getItem(THEME_KEY)
        return t === 'light' || t === 'dark' ? t : null
    } catch {
        return null
    }
}

function applyTheme(dark: boolean) {
    const el = document.documentElement
    el.classList.toggle('dark', dark)
    el.style.colorScheme = dark ? 'dark' : 'light'
}

export function setTheme(theme: 'light' | 'dark') {
    try {
        localStorage.setItem(THEME_KEY, theme)
    } catch {
        // Storage blocked: still switch for this visit.
    }
    const apply = () => {
        applyTheme(theme === 'dark')
        window.dispatchEvent(new Event(EVENT))
    }
    // Crossfade the whole page at once. (Fading only some colors left white text on a
    // white page for a moment.) Browsers without view transitions switch instantly.
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!reduce && typeof document.startViewTransition === 'function') document.startViewTransition(apply)
    else apply()
}

function subscribe(onChange: () => void) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onSystem = () => {
        if (!readSaved()) applyTheme(mq.matches)
        onChange()
    }
    window.addEventListener(EVENT, onChange)
    mq.addEventListener('change', onSystem)
    return () => {
        window.removeEventListener(EVENT, onChange)
        mq.removeEventListener('change', onSystem)
    }
}

/** true when dark mode is active. Always false during server rendering. */
export function useIsDark() {
    // Re-apply after React's dev-mode remount clears the class set by the inline script.
    useLayoutEffect(() => {
        const saved = readSaved()
        applyTheme(saved ? saved === 'dark' : systemPrefersDark())
    }, [])
    return useSyncExternalStore(
        subscribe,
        () => document.documentElement.classList.contains('dark'),
        () => false,
    )
}
