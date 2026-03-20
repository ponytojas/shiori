import type { ModelBookmarkDTO } from '@/client'

export type OperationalReadingMode = 'all' | 'leer-hoy' | 'rapido' | 'foco' | 'inspiracion'

export type OperationalReadingPreset = {
  mode: OperationalReadingMode
  label: string
  description: string
}

export const OPERATIONAL_READING_PRESETS: OperationalReadingPreset[] = [
  { mode: 'all', label: 'Inbox', description: 'All active bookmarks' },
  { mode: 'leer-hoy', label: 'Leer hoy', description: 'Shortlist for today' },
  { mode: 'rapido', label: 'Rapido', description: 'Fast reads' },
  { mode: 'foco', label: 'Foco', description: 'Deep work reading' },
  { mode: 'inspiracion', label: 'Inspiracion', description: 'Idea fuel' },
]

export const OPERATIONAL_TAGS: Exclude<OperationalReadingMode, 'all'>[] = ['leer-hoy', 'rapido', 'foco', 'inspiracion']

const operationalModes = new Set<OperationalReadingMode>(['all', 'leer-hoy', 'rapido', 'foco', 'inspiracion'])

export function parseOperationalReadingMode(rawValue: string | null): OperationalReadingMode {
  if (rawValue && operationalModes.has(rawValue as OperationalReadingMode)) {
    return rawValue as OperationalReadingMode
  }

  return 'all'
}

export function getBookmarkTagNames(bookmark: ModelBookmarkDTO): string[] {
  return (bookmark.tags ?? [])
    .map((tag) => tag.name?.trim().toLowerCase() ?? '')
    .filter(Boolean)
}

export function bookmarkHasTag(bookmark: ModelBookmarkDTO, tagName: string): boolean {
  const normalizedTag = tagName.trim().toLowerCase()
  if (!normalizedTag) return false

  return getBookmarkTagNames(bookmark).includes(normalizedTag)
}

export function getOperationalTags(bookmark: ModelBookmarkDTO): OperationalReadingMode[] {
  const tagNames = new Set(getBookmarkTagNames(bookmark))

  return OPERATIONAL_TAGS.filter((mode) => tagNames.has(mode))
}

export function filterBookmarksByOperationalMode(bookmarks: ModelBookmarkDTO[], mode: OperationalReadingMode): ModelBookmarkDTO[] {
  if (mode === 'all') {
    return bookmarks
  }

  return bookmarks.filter((bookmark) => bookmarkHasTag(bookmark, mode))
}
