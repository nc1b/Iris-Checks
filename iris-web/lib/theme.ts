'use client'
import { useLayoutEffect, useSyncExternalStore } from 'react'

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
    }
    const apply = () => {
        applyTheme(theme === 'dark')
        window.dispatchEvent(new Event(EVENT))
    }
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

export function useIsDark() {
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
