import { Archive, ArrowUpRight, Search, Trash2 } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useArchiveBookmarkMutation, useBookmarksQuery, useDeleteBookmarkMutation, useOperationalTagToggleMutation } from '@/lib/bookmarks-query'
import { BOOKMARK_GROUP_ORDER, groupBookmarksBySavedDate, normalizeBookmarkDomain } from '@/lib/bookmark-presentation'
import {
  filterBookmarksByOperationalMode,
  getOperationalTags,
  OPERATIONAL_TAGS,
  OPERATIONAL_READING_PRESETS,
  parseOperationalReadingMode,
} from '@/lib/operational-reading'

function getFaviconUrl(rawUrl: string): string {
  try {
    const host = new URL(rawUrl).hostname
    return `https://www.google.com/s2/favicons?sz=32&domain=${encodeURIComponent(host)}`
  } catch {
    return '/favicon.ico'
  }
}

function WorkflowBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-[#F5E9DD] px-2 py-0.5 text-[11px] font-medium text-[#7A5A44]">
      {label}
    </span>
  )
}

export function BookmarksPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeMode = parseOperationalReadingMode(searchParams.get('workflow'))
  const initialSearch = searchParams.get('q') ?? ''
  const [searchInput, setSearchInput] = useState(initialSearch)
  const searchKeyword = searchParams.get('q')?.trim() ?? ''
  const bookmarksQuery = useBookmarksQuery({ archived: false, exclude: ['archive'], keyword: searchKeyword || undefined })
  const archiveMutation = useArchiveBookmarkMutation()
  const deleteMutation = useDeleteBookmarkMutation()
  const operationalTagToggleMutation = useOperationalTagToggleMutation()
  const inboxBookmarks = bookmarksQuery.data ?? []
  const todayBookmarks = filterBookmarksByOperationalMode(inboxBookmarks, 'leer-hoy')
  const visibleBookmarks = filterBookmarksByOperationalMode(inboxBookmarks, activeMode)
  const groupedBookmarks = groupBookmarksBySavedDate(visibleBookmarks)
  const activePreset = OPERATIONAL_READING_PRESETS.find((preset) => preset.mode === activeMode) ?? OPERATIONAL_READING_PRESETS[0]

  const setWorkflow = (mode: string) => {
    const nextParams = new URLSearchParams(searchParams)

    if (mode === 'all') {
      nextParams.delete('workflow')
    } else {
      nextParams.set('workflow', mode)
    }

    setSearchParams(nextParams, { replace: true })
  }

  useEffect(() => {
    setSearchInput(initialSearch)
  }, [initialSearch])

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextParams = new URLSearchParams(searchParams)
    const normalizedSearch = searchInput.trim()

    if (normalizedSearch) {
      nextParams.set('q', normalizedSearch)
    } else {
      nextParams.delete('q')
    }

    setSearchParams(nextParams, { replace: true })
  }

  return (
    <section className="space-y-4">
      <section className="rounded-2xl border border-[#E8D8C8] bg-[linear-gradient(135deg,#FFF9F2_0%,#F8EFE5_100%)] p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9B7B64]">Operational reading</p>
            <div className="space-y-1">
              <h1 className="text-xl font-semibold text-[#2B1B10]">What should I read today?</h1>
              <p className="text-sm text-[#6D5646]">
                Use existing tags to turn Inbox into a lightweight reading workflow. Start with <span className="font-medium text-[#2B1B10]">leer-hoy</span> for today, then sort by <span className="font-medium text-[#2B1B10]">rapido</span>, <span className="font-medium text-[#2B1B10]">foco</span>, or <span className="font-medium text-[#2B1B10]">inspiracion</span>.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-white/80 bg-white/80 px-3 py-2 text-sm text-[#6D5646] shadow-sm">
            <p className="font-medium text-[#2B1B10]">{todayBookmarks.length} tagged for today</p>
            <p>Tag bookmarks with <span className="font-medium text-[#2B1B10]">leer-hoy</span> to keep this shortlist focused.</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {OPERATIONAL_READING_PRESETS.map((preset) => {
            const count =
              preset.mode === 'all' ? inboxBookmarks.length : filterBookmarksByOperationalMode(inboxBookmarks, preset.mode).length
            const isActive = activeMode === preset.mode

            return (
              <Button
                key={preset.mode}
                type="button"
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                className={isActive ? 'bg-[#2B1B10] text-[#FFF9F2] hover:bg-[#2B1B10]/90' : 'bg-white/80'}
                onClick={() => setWorkflow(preset.mode)}
                title={preset.description}
              >
                {preset.label} · {count}
              </Button>
            )
          })}
        </div>

        <form className="mt-4" onSubmit={submitSearch}>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9B7B64]" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search inbox by title, URL, excerpt or tags"
                className="border-[#E8D8C8] bg-white pl-9"
              />
            </div>
            <Button type="submit" variant="outline" className="bg-white/80">
              Apply search
            </Button>
            {searchKeyword ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSearchInput('')
                  const nextParams = new URLSearchParams(searchParams)
                  nextParams.delete('q')
                  setSearchParams(nextParams, { replace: true })
                }}
              >
                Clear
              </Button>
            ) : null}
          </div>
        </form>

        <div className="mt-4 rounded-xl border border-[#E8D8C8] bg-white/85 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[#2B1B10]">Leer hoy shortlist</h2>
              <p className="text-xs text-[#8C735F]">A small, explicit list built from your existing bookmarks.</p>
            </div>
          </div>

          {todayBookmarks.length === 0 ? (
            <p className="text-sm text-[#6D5646]">
              Nothing is tagged <span className="font-medium text-[#2B1B10]">leer-hoy</span> yet. Add that tag to a few bookmarks and they will show up here immediately.
            </p>
          ) : (
            <div className="space-y-2">
              {todayBookmarks.slice(0, 5).map((bookmark) => (
                <button
                  key={bookmark.id ?? bookmark.url}
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg border border-transparent px-2 py-2 text-left transition-colors hover:border-[#E8D8C8] hover:bg-[#FDF7F0]"
                  onClick={() => {
                    if (bookmark.url) {
                      window.open(bookmark.url, '_blank', 'noopener,noreferrer')
                    }
                  }}
                >
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm font-medium text-[#2B1B10]">{bookmark.title || bookmark.url}</p>
                    <p className="line-clamp-1 text-xs text-[#8C735F]">{normalizeBookmarkDomain(bookmark.url)}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-[#8C735F]" />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {bookmarksQuery.isLoading && <p className="text-sm text-muted-foreground">Loading bookmarks…</p>}
      {bookmarksQuery.error && <p className="text-sm text-red-600">Failed to load bookmarks.</p>}

      {!bookmarksQuery.isLoading && searchKeyword ? (
        <p className="text-sm text-muted-foreground">
          Search active: <span className="font-medium text-foreground">{searchKeyword}</span>
        </p>
      ) : null}

      {!bookmarksQuery.isLoading && visibleBookmarks.length === 0 ? (
        <div className="p-1 text-sm text-muted-foreground">
          {activeMode === 'all' ? 'No bookmarks in Inbox yet.' : `No bookmarks tagged ${activePreset.label.toLowerCase()} yet.`}
        </div>
      ) : (
        <div className="mx-auto w-full max-w-3xl space-y-4">
          {BOOKMARK_GROUP_ORDER.map(({ key, label }) => {
            const items = groupedBookmarks[key]
            if (!items.length) return null

            return (
              <section key={key} className="space-y-2">
                <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</h2>
                {items.map((bookmark) => (
                  (() => {
                    const workflowTags = getOperationalTags(bookmark)

                    return (
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
                            {workflowTags.length > 0 ? (
                              <div className="mt-2 flex flex-wrap gap-1 pl-7">
                                {workflowTags.map((tag) => (
                                  <WorkflowBadge key={tag} label={tag} />
                                ))}
                              </div>
                            ) : null}
                            <div className="mt-2 flex flex-wrap gap-1 pl-7">
                              {OPERATIONAL_TAGS.map((tag) => {
                                const isActive = workflowTags.includes(tag)

                                return (
                                  <Button
                                    key={tag}
                                    type="button"
                                    variant={isActive ? 'default' : 'outline'}
                                    size="sm"
                                    className={isActive ? 'h-7 bg-[#7A5A44] px-2 text-xs text-white hover:bg-[#6A4B36]' : 'h-7 px-2 text-xs'}
                                    disabled={!bookmark.id || operationalTagToggleMutation.isPending}
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      operationalTagToggleMutation.mutate({
                                        bookmark,
                                        tagName: tag,
                                      })
                                    }}
                                  >
                                    {tag}
                                  </Button>
                                )
                              })}
                            </div>
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
                    )
                  })()
                ))}
              </section>
            )
          })}
        </div>
      )}
    </section>
  )
}
