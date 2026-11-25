import { useEffect, useRef, useState } from 'react'

/** Open/close state for a floating panel that closes on outside click and Escape. */
export function usePopover() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return { open, setOpen, toggle: () => setOpen((value) => !value), ref }
}

export function usePersistentFlag(key: string, initial: boolean): [boolean, (value: boolean) => void] {
  const [value, setValue] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(key)
      return saved === null ? initial : saved === '1'
    } catch {
      return initial
    }
  })

  const update = (next: boolean) => {
    setValue(next)
    try {
      localStorage.setItem(key, next ? '1' : '0')
    } catch {
      // Storage can be unavailable (private mode); the setting still applies for this session.
    }
  }

  return [value, update]
}

export type Theme = 'light' | 'dark'
const THEME_KEY = 'avora-theme'
const THEME_EVENT = 'avora-theme-change'

function getInitialTheme(): Theme {
  if (typeof document !== 'undefined') {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  }
  return 'dark'
}

/** index.html applies a saved dark choice before first paint; this reads it back, reacts to changes across components, and persists changes. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    const syncTheme = () => {
      const isDark = document.documentElement.classList.contains('dark')
      setTheme(isDark ? 'dark' : 'light')
    }

    // Immediately synchronize with DOM on mount
    syncTheme()

    window.addEventListener(THEME_EVENT, syncTheme)
    window.addEventListener('storage', syncTheme)

    // Observe class attribute changes on <html> to synchronize with any direct class mutations
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === 'class') {
          syncTheme()
        }
      }
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    return () => {
      window.removeEventListener(THEME_EVENT, syncTheme)
      window.removeEventListener('storage', syncTheme)
      observer.disconnect()
    }
  }, [])

  const apply = (next: Theme) => {
    setTheme(next)
    document.documentElement.classList.toggle('dark', next === 'dark')
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      // Storage can be unavailable; the theme still applies for this session.
    }
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: next }))
  }

  return { theme, setTheme: apply, toggle: () => apply(theme === 'dark' ? 'light' : 'dark') }
}
