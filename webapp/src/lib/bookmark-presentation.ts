import type { ModelBookmarkDTO } from '@/client/models/ModelBookmarkDTO'

export type BookmarkDateGroupKey = 'today' | 'thisWeek' | 'lastWeek' | 'lastMonth' | 'older'

export const BOOKMARK_GROUP_ORDER: Array<{ key: BookmarkDateGroupKey; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'thisWeek', label: 'This week' },
  { key: 'lastWeek', label: 'Last week' },
  { key: 'lastMonth', label: 'Last month' },
  { key: 'older', label: 'Older' },
]

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function startOfWeek(date: Date): Date {
  const current = startOfDay(date)
  const day = current.getDay() // Sunday=0 ... Saturday=6
  const distanceFromMonday = (day + 6) % 7
  current.setDate(current.getDate() - distanceFromMonday)
  return current
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function toGroupKey(dateValue: string | undefined, now: Date): BookmarkDateGroupKey {
  if (!dateValue) return 'older'

  const savedAt = new Date(dateValue)
  if (Number.isNaN(savedAt.getTime())) return 'older'

  const savedDay = startOfDay(savedAt)
  const today = startOfDay(now)
  if (savedDay.getTime() === today.getTime()) return 'today'

  const thisWeekStart = startOfWeek(now)
  if (savedDay >= thisWeekStart) return 'thisWeek'

  const lastWeekStart = new Date(thisWeekStart)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)
  if (savedDay >= lastWeekStart) return 'lastWeek'

  const thisMonthStart = startOfMonth(now)
  const lastMonthStart = new Date(thisMonthStart.getFullYear(), thisMonthStart.getMonth() - 1, 1)
  if (savedDay >= lastMonthStart) return 'lastMonth'

  return 'older'
}

export function groupBookmarksBySavedDate(bookmarks: ModelBookmarkDTO[], now: Date = new Date()) {
  const grouped: Record<BookmarkDateGroupKey, ModelBookmarkDTO[]> = {
    today: [],
    thisWeek: [],
    lastWeek: [],
    lastMonth: [],
    older: [],
  }

  for (const bookmark of bookmarks) {
    const key = toGroupKey(bookmark.createdAt, now)
    grouped[key].push(bookmark)
  }

  return grouped
}

export function normalizeBookmarkDomain(rawUrl: string | undefined): string {
  if (!rawUrl) return ''

  const value = rawUrl.trim()
  if (!value) return ''

  const withProtocol = /^[a-z][a-z\d+\-.]*:\/\//i.test(value) ? value : `https://${value}`

  try {
    const candidate = new URL(withProtocol)
    return candidate.hostname.replace(/^www\./i, '').toLowerCase()
  } catch {
    return value
      .replace(/^[a-z][a-z\d+\-.]*:\/\//i, '')
      .replace(/^www\./i, '')
      .split(/[/?#]/)[0]
      .toLowerCase()
  }
}
