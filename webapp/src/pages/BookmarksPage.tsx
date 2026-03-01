import { Archive, Trash2 } from 'lucide-react'
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
  const bookmarks = bookmarksQuery.data ?? []

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
        <div className="max-h-[70vh] space-y-2 overflow-auto">
          {bookmarks.map((bookmark) => (
            <div
              key={bookmark.id ?? bookmark.url}
              role="button"
              tabIndex={0}
              className="group w-full rounded-lg px-3 py-3 text-left transition-colors hover:bg-secondary/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => {
                if (bookmark.url) {
                  window.open(bookmark.url, '_blank', 'noopener,noreferrer')
                }
              }}
              onKeyDown={(event) => {
                if ((event.key === 'Enter' || event.key === ' ') && bookmark.url) {
                  event.preventDefault()
                  window.open(bookmark.url, '_blank', 'noopener,noreferrer')
                }
              }}
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
                    className="h-7 w-7 p-0"
                    title="Archive"
                    aria-label="Archive"
                    disabled={!bookmark.id || archiveMutation.isPending}
                    onClick={(event) => {
                      event.stopPropagation()
                      archiveMutation.mutate(bookmark)
                    }}
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-7 w-7 p-0"
                    title="Delete"
                    aria-label="Delete"
                    disabled={!bookmark.id || deleteMutation.isPending}
                    onClick={(event) => {
                      event.stopPropagation()
                      if (bookmark.id) deleteMutation.mutate(bookmark.id)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
