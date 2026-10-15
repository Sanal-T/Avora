import { useState, useEffect } from 'react'

export type ToastTone = 'success' | 'danger' | 'warning' | 'info'

export type ToastMessage = {
  id: string
  title: string
  description?: string
  tone?: ToastTone
}

type ToastListener = (toasts: ToastMessage[]) => void

let toasts: ToastMessage[] = []
const listeners = new Set<ToastListener>()

function notify() {
  listeners.forEach((listener) => listener([...toasts]))
}

export const toast = {
  show(title: string, options?: { description?: string; tone?: ToastTone; duration?: number }) {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: ToastMessage = {
      id,
      title,
      description: options?.description,
      tone: options?.tone || 'info',
    }
    toasts = [...toasts, newToast]
    notify()

    const duration = options?.duration ?? 4000
    if (duration > 0) {
      setTimeout(() => {
        toast.dismiss(id)
      }, duration)
    }
    return id
  },
  success(title: string, description?: string) {
    return toast.show(title, { description, tone: 'success' })
  },
  error(title: string, description?: string) {
    return toast.show(title, { description, tone: 'danger' })
  },
  warning(title: string, description?: string) {
    return toast.show(title, { description, tone: 'warning' })
  },
  info(title: string, description?: string) {
    return toast.show(title, { description, tone: 'info' })
  },
  dismiss(id: string) {
    toasts = toasts.filter((t) => t.id !== id)
    notify()
  },
}

export function useToasts() {
  const [currentToasts, setCurrentToasts] = useState<ToastMessage[]>(toasts)

  useEffect(() => {
    listeners.add(setCurrentToasts)
    return () => {
      listeners.delete(setCurrentToasts)
    }
  }, [])

  return currentToasts
}
