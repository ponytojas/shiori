import { Archive, Check, Search, Tag, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { WorkflowFilterBar } from '@/components/bookmarks/WorkflowFilterBar'
import { useArchiveBookmarkMutation, useBookmarksQuery, useDeleteBookmarkMutation, useOperationalTagToggleMutation } from '@/lib/bookmarks-query'
import { BOOKMARK_GROUP_ORDER, groupBookmarksBySavedDate, normalizeBookmarkDomain } from '@/lib/bookmark-presentation'
import {
  filterBookmarksByOperationalMode,
  getOperationalTags,
  OPERATIONAL_READING_PRESETS,
  OPERATIONAL_TAGS,
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

export function BookmarksPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeMode = parseOperationalReadingMode(searchParams.get('workflow'))
  const searchKeyword = searchParams.get('q')?.trim() ?? ''
  const [searchInput, setSearchInput] = useState(searchKeyword)
  const [openTagPickerFor, setOpenTagPickerFor] = useState<number | string | null>(null)

  const bookmarksQuery = useBookmarksQuery({ archived: false, exclude: ['archive'], keyword: searchKeyword || undefined })
  const archiveMutation = useArchiveBookmarkMutation()
  const deleteMutation = useDeleteBookmarkMutation()
  const operationalTagToggleMutation = useOperationalTagToggleMutation()
  const visibleBookmarks = bookmarksQuery.data ?? []
  const filteredBookmarks = filterBookmarksByOperationalMode(visibleBookmarks, activeMode)
  const groupedBookmarks = groupBookmarksBySavedDate(filteredBookmarks)
  const activePreset = OPERATIONAL_READING_PRESETS.find((preset) => preset.mode === activeMode) ?? OPERATIONAL_READING_PRESETS[0]

  const bottomSpacerClass = useMemo(() => 'pb-28', [])

  const setWorkflow = (mode: string) => {
    const nextParams = new URLSearchParams(searchParams)

    if (mode === 'all' || mode === activeMode) {
      nextParams.delete('workflow')
    } else {
      nextParams.set('workflow', mode)
    }

    setSearchParams(nextParams, { replace: true })
  }

  useEffect(() => {
    setSearchInput(searchKeyword)
  }, [searchKeyword])

  useEffect(() => {
    const normalizedSearch = searchInput.trim()
    const currentSearch = searchKeyword

    if (normalizedSearch === currentSearch) return

    const timeout = window.setTimeout(() => {
      const nextParams = new URLSearchParams(searchParams)

      if (normalizedSearch) {
        nextParams.set('q', normalizedSearch)
      } else {
        nextParams.delete('q')
      }

      setSearchParams(nextParams, { replace: true })
    }, 300)

    return () => window.clearTimeout(timeout)
  }, [searchInput, searchKeyword, searchParams, setSearchParams])

  useEffect(() => {
    const close = () => setOpenTagPickerFor(null)
    window.addEventListener('scroll', close, true)
    return () => window.removeEventListener('scroll', close, true)
  }, [])

  return (
    <section className="relative h-full min-h-0">
      <div className={`space-y-4 ${bottomSpacerClass}`}>
        <WorkflowFilterBar activeMode={activeMode} bookmarks={visibleBookmarks} onSelect={(mode) => setWorkflow(mode)} />

        {bookmarksQuery.isLoading && <p className="text-sm text-muted-foreground">Loading bookmarks…</p>}
        {bookmarksQuery.error && <p className="text-sm text-red-600">Failed to load bookmarks.</p>}

        {!bookmarksQuery.isLoading && filteredBookmarks.length === 0 ? (
          <div className="p-1 text-sm text-muted-foreground">
            {activeMode === 'all' ? 'No bookmarks in Inbox yet.' : `No bookmarks tagged ${activePreset.label.toLowerCase()} yet.`}
          </div>
        ) : (
          <div className="mx-auto w-full max-w-4xl space-y-4">
            {BOOKMARK_GROUP_ORDER.map(({ key, label }) => {
              const items = groupedBookmarks[key]
              if (!items.length) return null

              return (
                <section key={key} className="space-y-2">
                  <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</h2>
                  {items.map((bookmark) => {
                    const workflowTags = getOperationalTags(bookmark)
                    const bookmarkKey = bookmark.id ?? bookmark.url ?? bookmark.title ?? 'bookmark'
                    const pickerOpen = openTagPickerFor === bookmarkKey

                    return (
                      <div
                        key={bookmarkKey}
                        role="button"
                        tabIndex={0}
                        className="group relative w-full rounded-lg px-3 py-3 text-left transition-colors hover:bg-[#F8F1E6] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-3">
                              <img
                                src={getFaviconUrl(bookmark.url ?? '')}
                                alt=""
                                className="mt-0.5 h-4 w-4 shrink-0 rounded-sm"
                                loading="lazy"
                              />
                              <p className="line-clamp-1 text-sm font-medium text-[#2B1B10]">{bookmark.title || bookmark.url}</p>
                              <span className="line-clamp-1 text-xs text-[#B49C8B]">{normalizeBookmarkDomain(bookmark.url)}</span>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-1 pl-7 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                              {workflowTags.map((tag) => {
                                const tagLabel = OPERATIONAL_READING_PRESETS.find((preset) => preset.mode === tag)?.label ?? tag
                                return (
                                  <button
                                    key={tag}
                                    type="button"
                                    disabled={operationalTagToggleMutation.isPending}
                                    className="group/tag inline-flex items-center gap-1 rounded-full bg-[#F5E9DD] px-2 py-0.5 text-[11px] font-medium text-[#7A5A44] transition-colors hover:bg-[#EDCFBC] hover:text-[#5B3A28] disabled:opacity-50"
                                    title={`Remove "${tagLabel}" tag`}
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      operationalTagToggleMutation.mutate({ bookmark, tagName: tag })
                                    }}
                                  >
                                    {tagLabel}
                                    <X className="h-2.5 w-2.5 opacity-0 transition-opacity group-hover/tag:opacity-100" />
                                  </button>
                                )
                              })}
                            </div>
                          </div>

                          <div className="relative flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-[#6D5646] hover:bg-[#F5E9DD]"
                              title="Tags"
                              aria-label="Tags"
                              disabled={!bookmark.id || operationalTagToggleMutation.isPending}
                              onClick={(event) => {
                                event.stopPropagation()
                                setOpenTagPickerFor((current) => (current === bookmarkKey ? null : bookmarkKey))
                              }}
                            >
                              <Tag className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-[#6D5646] hover:bg-[#F5E9DD]"
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
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-[#6D5646] hover:bg-[#F5E9DD]"
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

                            {pickerOpen ? (
                              <div
                                className="absolute right-0 top-10 z-20 min-w-40 rounded-xl border border-[#E8D8C8] bg-white p-2"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <div className="flex flex-col gap-1">
                                  {OPERATIONAL_TAGS.map((tag) => {
                                    const isActive = workflowTags.includes(tag)
                                    const tagLabel = OPERATIONAL_READING_PRESETS.find((preset) => preset.mode === tag)?.label ?? tag

                                    return (
                                      <button
                                        key={tag}
                                        type="button"
                                        disabled={operationalTagToggleMutation.isPending}
                                        className={`group/picker inline-flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors disabled:opacity-50 ${
                                          isActive
                                            ? 'bg-[#F5E9DD] text-[#5B4334] hover:bg-[#EDCFBC]'
                                            : 'text-[#7A6251] hover:bg-[#F8F1E6]'
                                        }`}
                                        title={isActive ? `Remove "${tagLabel}" tag` : `Add "${tagLabel}" tag`}
                                        onClick={(event) => {
                                          event.stopPropagation()
                                          operationalTagToggleMutation.mutate({ bookmark, tagName: tag })
                                        }}
                                      >
                                        {tagLabel}
                                        {isActive && (
                                          <span className="relative ml-2 inline-flex h-3 w-3 shrink-0">
                                            <Check className="absolute h-3 w-3 transition-opacity group-hover/picker:opacity-0" />
                                            <X className="absolute h-3 w-3 opacity-0 transition-opacity group-hover/picker:opacity-100" />
                                          </span>
                                        )}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </section>
              )
            })}
          </div>
        )}
      </div>

      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-30">
        <div className="w-full bg-gradient-to-t from-background via-background/85 to-transparent">
          <div className="h-14" />
          <div className="mx-auto w-full max-w-4xl px-4 pb-4">
            <div className="pointer-events-auto relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9B7B64]" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search..."
                className="h-11 rounded-full border-[#E8D8C8] bg-white pl-9"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
