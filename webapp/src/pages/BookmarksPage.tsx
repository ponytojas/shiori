import { useEffect, useMemo, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useArchiveBookmarkMutation, useBookmarksQuery, useDeleteBookmarkMutation } from '@/lib/bookmarks-query'

function getFaviconUrl(rawUrl: string): string {
  try {
    const host = new URL(rawUrl).hostname
    return `https://www.google.com/s2/favicons?sz=32&domain=${encodeURIComponent(host)}`
  } catch {
    return '/favicon.ico'
  }
}

export function BookmarksPage() {
  const bookmarksQuery = useBookmarksQuery(false)
  const archiveMutation = useArchiveBookmarkMutation()
  const deleteMutation = useDeleteBookmarkMutation()
  const bookmarks = useMemo(() => bookmarksQuery.data ?? [], [bookmarksQuery.data])
  const [selectedId, setSelectedId] = useState<number | null>(null)

  useEffect(() => {
    if (!bookmarks.length) {
      setSelectedId(null)
      return
    }

    if (selectedId && bookmarks.some((bookmark) => bookmark.id === selectedId)) {
      return
    }

    setSelectedId(bookmarks[0]?.id ?? null)
  }, [bookmarks, selectedId])

  const selected = bookmarks.find((bookmark) => bookmark.id === selectedId) ?? bookmarks[0]

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Inbox</h1>
        <p className="text-sm text-muted-foreground">Saved links ready to review.</p>
      </div>

      {bookmarksQuery.isLoading && <p className="text-sm text-muted-foreground">Loading bookmarks…</p>}
      {bookmarksQuery.error && <p className="text-sm text-red-600">Failed to load bookmarks.</p>}

      {!bookmarksQuery.isLoading && bookmarks.length === 0 ? (
        <div className="p-1 text-sm text-muted-foreground">No bookmarks in Inbox yet.</div>
      ) : (
        <div className="grid min-h-[60vh] gap-6 md:grid-cols-[minmax(260px,340px)_1fr]">
          <aside className="max-h-[70vh] overflow-auto">
            {bookmarks.map((bookmark) => {
              const isActive = bookmark.id === selected?.id

              return (
                <button
                  key={bookmark.id ?? bookmark.url}
                  type="button"
                  className={`group w-full rounded-lg px-3 py-3 text-left transition-colors ${
                    isActive ? 'bg-secondary/55' : 'hover:bg-secondary/35'
                  }`}
                  onClick={() => setSelectedId(bookmark.id ?? null)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <img
                          src={getFaviconUrl(bookmark.url ?? '')}
                          alt=""
                          className="mt-0.5 h-4 w-4 shrink-0 rounded-sm"
                          loading="lazy"
                        />
                        <p className="line-clamp-1 text-sm font-medium">{bookmark.title || bookmark.url}</p>
                      </div>
                      <p className="line-clamp-1 pl-6 text-xs text-muted-foreground">{bookmark.url}</p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2"
                        disabled={!bookmark.id || archiveMutation.isPending}
                        onClick={(event) => {
                          event.stopPropagation()
                          archiveMutation.mutate(bookmark)
                        }}
                      >
                        Archive
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-7 px-2"
                        disabled={!bookmark.id || deleteMutation.isPending}
                        onClick={(event) => {
                          event.stopPropagation()
                          if (bookmark.id) deleteMutation.mutate(bookmark.id)
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </button>
              )
            })}
          </aside>

          <article className="p-1 md:p-3">
            {selected ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">{selected.title || selected.url}</h2>
                  <a
                    className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                    href={selected.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {selected.url}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>

                <p className="text-sm text-muted-foreground">{selected.excerpt?.trim() || 'No description available.'}</p>

                <div className="text-xs text-muted-foreground">
                  {(selected.tags ?? []).map((tag) => tag.name).filter(Boolean).join(', ') || 'No tags'}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select a bookmark to see details.</p>
            )}
          </article>
        </div>
      )}
    </section>
  )
}
