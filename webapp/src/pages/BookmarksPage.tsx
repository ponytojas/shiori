import { Archive, BookOpenText, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { getReadableBookmark } from '@/lib/api'
import { useArchiveBookmarkMutation, useBookmarksQuery, useDeleteBookmarkMutation } from '@/lib/bookmarks-query'
import { BOOKMARK_GROUP_ORDER, groupBookmarksBySavedDate, normalizeBookmarkDomain } from '@/lib/bookmark-presentation'

function getFaviconUrl(rawUrl: string): string {
  try {
    const host = new URL(rawUrl).hostname
    return `https://www.google.com/s2/favicons?sz=32&domain=${encodeURIComponent(host)}`
  } catch {
    return '/favicon.ico'
  }
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function BookmarksPage() {
  const bookmarksQuery = useBookmarksQuery(false)
  const archiveMutation = useArchiveBookmarkMutation()
  const deleteMutation = useDeleteBookmarkMutation()
  const [isReaderOpen, setIsReaderOpen] = useState(false)
  const [isReaderLoading, setIsReaderLoading] = useState(false)
  const [readerTitle, setReaderTitle] = useState('Readable view')
  const [readerError, setReaderError] = useState<string | null>(null)
  const [readerHtml, setReaderHtml] = useState('')

  const bookmarks = bookmarksQuery.data ?? []
  const groupedBookmarks = groupBookmarksBySavedDate(bookmarks)

  const handleOpenReader = async (bookmarkId: number, title?: string) => {
    setIsReaderOpen(true)
    setIsReaderLoading(true)
    setReaderError(null)
    setReaderTitle(title?.trim() || 'Readable view')

    try {
      const readable = await getReadableBookmark(bookmarkId)
      const html = readable.html?.trim()
      const content = readable.content?.trim()

      if (html) {
        setReaderHtml(html)
        return
      }

      if (content) {
        setReaderHtml(`<p>${escapeHtml(content).replace(/\n/g, '<br />')}</p>`)
        return
      }

      setReaderError('Readable content is empty for this bookmark.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not open reading mode.'
      setReaderError(message)
    } finally {
      setIsReaderLoading(false)
    }
  }

  return (
    <section className="space-y-4">

      {bookmarksQuery.isLoading && <p className="text-sm text-muted-foreground">Loading bookmarks…</p>}
      {bookmarksQuery.error && <p className="text-sm text-red-600">Failed to load bookmarks.</p>}

      {!bookmarksQuery.isLoading && bookmarks.length === 0 ? (
        <div className="p-1 text-sm text-muted-foreground">No bookmarks in Inbox yet.</div>
      ) : (
        <div className="mx-auto w-full max-w-3xl space-y-4">
          {BOOKMARK_GROUP_ORDER.map(({ key, label }) => {
            const items = groupedBookmarks[key]
            if (!items.length) return null

            return (
              <section key={key} className="space-y-2">
                <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</h2>
                {items.map((bookmark) => (
                  <div
                    key={bookmark.id ?? bookmark.url}
                    role="button"
                    tabIndex={0}
                    className="group w-full rounded-lg px-3 py-3 text-left transition-colors hover:bg-[#F8F1E6] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                        <div className="flex items-center gap-3">
                          <img
                            src={getFaviconUrl(bookmark.url ?? '')}
                            alt=""
                            className="mt-0.5 h-4 w-4 shrink-0 rounded-sm"
                            loading="lazy"
                          />
                          <p className="line-clamp-1 text-sm font-medium">{bookmark.title || bookmark.url}</p>
                          <span className="line-clamp-1 text-xs text-[#B49C8B]">{normalizeBookmarkDomain(bookmark.url)}</span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 p-0"
                          title="Reading mode"
                          aria-label="Reading mode"
                          disabled={!bookmark.id}
                          onClick={async (event) => {
                            event.stopPropagation()
                            if (!bookmark.id) return
                            await handleOpenReader(bookmark.id, bookmark.title)
                          }}
                        >
                          <BookOpenText className="h-3.5 w-3.5" />
                        </Button>
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
              </section>
            )
          })}
        </div>
      )}

      {isReaderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setIsReaderOpen(false)}>
          <div
            className="flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-[#f8f6f1] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
              <h3 className="line-clamp-1 text-sm font-semibold">{readerTitle}</h3>
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setIsReaderOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {isReaderLoading && <p className="text-sm text-muted-foreground">Loading readable content…</p>}

              {!isReaderLoading && readerError && <p className="text-sm text-red-600">{readerError}</p>}

              {!isReaderLoading && !readerError && (
                <article
                  className="prose prose-sm max-w-none leading-relaxed text-[#1f2937]"
                  dangerouslySetInnerHTML={{ __html: readerHtml }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
