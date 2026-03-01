import { useEffect, useMemo, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useArchiveBookmarkMutation, useBookmarksQuery, useDeleteBookmarkMutation } from '@/lib/bookmarks-query'

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
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">No bookmarks in Inbox yet.</div>
      ) : (
        <div className="grid min-h-[60vh] gap-3 md:grid-cols-[minmax(240px,320px)_1fr]">
          <aside className="max-h-[70vh] overflow-auto rounded-lg border bg-card">
            {bookmarks.map((bookmark) => {
              const isActive = bookmark.id === selected?.id

              return (
                <button
                  key={bookmark.id ?? bookmark.url}
                  type="button"
                  className={`w-full border-b px-4 py-3 text-left transition-colors last:border-b-0 ${
                    isActive ? 'bg-accent/60' : 'hover:bg-secondary/70'
                  }`}
                  onClick={() => setSelectedId(bookmark.id ?? null)}
                >
                  <p className="line-clamp-1 text-sm font-medium">{bookmark.title || bookmark.url}</p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{bookmark.url}</p>
                </button>
              )
            })}
          </aside>

          <article className="rounded-lg border bg-card p-4 md:p-6">
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

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!selected.id || archiveMutation.isPending}
                    onClick={() => archiveMutation.mutate(selected)}
                  >
                    Archive
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!selected.id || deleteMutation.isPending}
                    onClick={() => selected.id && deleteMutation.mutate(selected.id)}
                  >
                    Delete
                  </Button>
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
