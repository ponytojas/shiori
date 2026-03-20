import { Plus } from 'lucide-react'
import { type FormEvent, type PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCreateBookmarkMutation } from '@/lib/bookmarks-query'
import { cn } from '@/lib/utils'

const links = [
  { to: '/inbox', label: 'Inbox' },
  { to: '/archive', label: 'Archive' },
]

function normalizeUrl(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`

  try {
    const candidate = new URL(withProtocol)
    if (!candidate.hostname.includes('.')) return null
    return candidate.toString()
  } catch {
    return null
  }
}

function BrandMark() {
  return (
    <svg viewBox="0 0 28 28" className="h-7 w-7" aria-hidden="true">
      <defs>
        <linearGradient id="brand-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFB449" />
          <stop offset="100%" stopColor="#FF4D1E" />
        </linearGradient>
      </defs>
      <circle cx="14" cy="14" r="12" fill="url(#brand-gradient)" />
    </svg>
  )
}

export function AppLayout({ children }: PropsWithChildren) {
  const location = useLocation()
  const createMutation = useCreateBookmarkMutation()
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickAddUrl, setQuickAddUrl] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const quickAddInputRefId = useMemo(() => 'quick-add-url-input', [])
  const activeTabIndex = useMemo(() => links.findIndex(({ to }) => location.pathname.startsWith(to)), [location.pathname])

  const saveBookmarkFromUrl = useCallback(
    async (rawUrl: string) => {
      const normalized = normalizeUrl(rawUrl)

      if (!normalized) {
        setToastMessage('Invalid URL in clipboard.')
        return false
      }

      try {
        await createMutation.mutateAsync({ url: normalized })
        setQuickAddOpen(false)
        setQuickAddUrl('')
        setToastMessage('Saved to Inbox.')
        return true
      } catch {
        setToastMessage('Could not save bookmark.')
        return false
      }
    },
    [createMutation],
  )

  const submitQuickAdd = useCallback(
    async (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault()
      const saved = await saveBookmarkFromUrl(quickAddUrl)

      if (saved) {
        setQuickAddOpen(false)
        setQuickAddUrl('')
      }
    },
    [quickAddUrl, saveBookmarkFromUrl],
  )

  useEffect(() => {
    if (!quickAddOpen) return

    const timer = window.setTimeout(() => {
      document.getElementById(quickAddInputRefId)?.focus()
    }, 10)

    return () => window.clearTimeout(timer)
  }, [quickAddInputRefId, quickAddOpen])

  useEffect(() => {
    if (!quickAddOpen) return

    const closeOnOutside = (event: MouseEvent) => {
      if (!popoverRef.current?.contains(event.target as Node)) {
        setQuickAddOpen(false)
      }
    }

    window.addEventListener('mousedown', closeOnOutside)
    return () => window.removeEventListener('mousedown', closeOnOutside)
  }, [quickAddOpen])

  useEffect(() => {
    if (!toastMessage) return

    const timer = window.setTimeout(() => setToastMessage(null), 2400)
    return () => window.clearTimeout(timer)
  }, [toastMessage])

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const active = document.activeElement as HTMLElement | null
      const isTypingField =
        !!active &&
        (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)

      if (isTypingField) return

      const text = event.clipboardData?.getData('text') ?? ''
      const normalized = normalizeUrl(text)
      if (!normalized) return

      event.preventDefault()
      void saveBookmarkFromUrl(normalized)
    }

    const handleKeydown = async (event: KeyboardEvent) => {
      const isPasteShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'v'
      if (!isPasteShortcut) return

      const active = document.activeElement as HTMLElement | null
      const isTypingField =
        !!active &&
        (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)

      if (isTypingField) return

      try {
        const clipboardText = await navigator.clipboard.readText()
        const normalized = normalizeUrl(clipboardText)
        if (!normalized) return

        event.preventDefault()
        void saveBookmarkFromUrl(normalized)
      } catch {
        // Ignore read failures and allow default paste behavior.
      }
    }

    window.addEventListener('paste', handlePaste)
    window.addEventListener('keydown', handleKeydown)

    return () => {
      window.removeEventListener('paste', handlePaste)
      window.removeEventListener('keydown', handleKeydown)
    }
  }, [saveBookmarkFromUrl])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur">
        <div className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-4">
          <div className="flex items-center gap-2">
            <BrandMark />
          </div>

          <nav className="relative flex items-center justify-center rounded-full bg-[#F5E9DD] p-1.5">
            <span
              className="absolute bottom-1.5 top-1.5 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] ring-1 ring-[#E8D8C8] transition-all duration-300 ease-out"
              style={{
                width: 'calc(50% - 6px)',
                left: activeTabIndex <= 0 ? '6px' : 'calc(50% + 1px)',
              }}
              aria-hidden="true"
            />
            {links.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'relative z-10 inline-flex min-w-24 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-300',
                    isActive ? 'text-[#2B1B10]' : 'text-[#7B675A] hover:text-[#2B1B10]',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="relative ml-auto" ref={popoverRef}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-9 rounded-full p-0"
              onClick={() => setQuickAddOpen((open) => !open)}
              aria-label="Add bookmark"
              title="Add bookmark"
            >
              <Plus className="h-4 w-4" />
            </Button>

            {quickAddOpen ? (
              <div className="absolute right-0 top-11 z-30 w-72 rounded-md border bg-background p-3 shadow-md">
                <form className="space-y-2" onSubmit={submitQuickAdd}>
                  <Input
                    id={quickAddInputRefId}
                    type="url"
                    placeholder="https://example.com"
                    value={quickAddUrl}
                    onChange={(event) => setQuickAddUrl(event.target.value)}
                    required
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setQuickAddOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={createMutation.isPending}>
                      {createMutation.isPending ? 'Saving…' : 'Save'}
                    </Button>
                  </div>
                </form>
              </div>
            ) : null}
          </div>
        </div>
        <div className="h-8 bg-gradient-to-b from-background via-background/80 to-transparent" />
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-6">{children}</main>

      {toastMessage ? (
        <div className="fixed bottom-4 right-4 rounded border bg-background px-3 py-1.5 text-sm text-muted-foreground shadow-sm">{toastMessage}</div>
      ) : null}
    </div>
  )
}
