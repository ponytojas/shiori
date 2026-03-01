import { Plus, Inbox, Archive } from 'lucide-react'
import { type FormEvent, type PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCreateBookmarkMutation } from '@/lib/bookmarks-query'
import { cn } from '@/lib/utils'

const links = [
  { to: '/inbox', label: 'Inbox', icon: Inbox },
  { to: '/archive', label: 'Archive', icon: Archive },
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

export function AppLayout({ children }: PropsWithChildren) {
  const createMutation = useCreateBookmarkMutation()
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickAddUrl, setQuickAddUrl] = useState('')
  const [quickAddMessage, setQuickAddMessage] = useState<string | null>(null)

  const quickAddInputRefId = useMemo(() => 'quick-add-url-input', [])

  const openQuickAdd = useCallback((prefilled = '') => {
    setQuickAddUrl(prefilled)
    setQuickAddMessage(null)
    setQuickAddOpen(true)
  }, [])

  const submitQuickAdd = useCallback(
    async (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault()
      const normalized = normalizeUrl(quickAddUrl)

      if (!normalized) {
        setQuickAddMessage('Please paste a valid URL.')
        return
      }

      try {
        await createMutation.mutateAsync({ url: normalized })
        setQuickAddMessage('Saved to Inbox.')
        setQuickAddOpen(false)
        setQuickAddUrl('')
      } catch {
        setQuickAddMessage('Failed to save bookmark.')
      }
    },
    [createMutation, quickAddUrl],
  )

  useEffect(() => {
    if (!quickAddOpen) return

    const timer = window.setTimeout(() => {
      document.getElementById(quickAddInputRefId)?.focus()
    }, 10)

    return () => window.clearTimeout(timer)
  }, [quickAddInputRefId, quickAddOpen])

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (quickAddOpen) return

      const text = event.clipboardData?.getData('text') ?? ''
      const normalized = normalizeUrl(text)
      if (!normalized) return

      const active = document.activeElement as HTMLElement | null
      const isTypingField =
        !!active &&
        (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)

      if (isTypingField) return

      event.preventDefault()
      openQuickAdd(normalized)
      setQuickAddMessage('Pasted URL captured. Confirm to save.')
    }

    const handleKeydown = async (event: KeyboardEvent) => {
      const isPasteShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'v'
      if (!isPasteShortcut || quickAddOpen) return

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
        openQuickAdd(normalized)
        setQuickAddMessage('Clipboard URL ready to save.')
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
  }, [openQuickAdd, quickAddOpen])

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/90">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="text-sm font-semibold tracking-wide text-foreground">Shiori</div>
          <div className="flex items-center gap-2">
            <nav className="flex items-center gap-1 rounded-md bg-secondary/70 p-1">
              {links.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      'inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm transition-colors',
                      isActive ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              ))}
            </nav>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-9 rounded-full p-0"
              onClick={() => openQuickAdd()}
              aria-label="Add bookmark"
              title="Add bookmark"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-4 md:p-6">{children}</main>

      {quickAddOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/20 px-4 pt-24" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-lg border bg-card p-4 shadow-lg">
            <form className="space-y-3" onSubmit={submitQuickAdd}>
              <p className="text-sm font-medium">Quick add</p>
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
        </div>
      ) : null}

      {quickAddMessage ? (
        <div className="fixed bottom-4 right-4 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground shadow">
          {quickAddMessage}
        </div>
      ) : null}
    </div>
  )
}
