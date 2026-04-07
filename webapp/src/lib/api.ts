import { AuthApi, Configuration, TagsApi, type ModelBookmarkDTO, type ModelTagDTO } from '@/client'
import { getStoredToken } from '@/lib/auth'

const rawApiBase = import.meta.env.VITE_API_BASE_URL?.trim() ?? ''
const isAbsoluteApiBase = /^https?:\/\//i.test(rawApiBase)

// In dev, keep requests same-origin so Vite proxy can forward /api calls and avoid browser CORS issues.
const API_BASE = import.meta.env.DEV && isAbsoluteApiBase ? '' : rawApiBase
export const API_BASE_URL = API_BASE

const CONTROL_HEADER_NAME = import.meta.env.VITE_API_CONTROL_HEADER_NAME?.trim() ?? ''
const CONTROL_HEADER_VALUE = import.meta.env.VITE_API_CONTROL_HEADER_VALUE?.trim() ?? ''

export function getGlobalHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}

  const token = getStoredToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  if (CONTROL_HEADER_NAME && CONTROL_HEADER_VALUE) {
    headers[CONTROL_HEADER_NAME] = CONTROL_HEADER_VALUE
  }

  return headers
}

const clientConfig = new Configuration({
  basePath: API_BASE,
  credentials: 'include',
  headers: getGlobalHeaders(),
  accessToken: () => getStoredToken() ?? '',
})

export const tagsApi = new TagsApi(clientConfig)
export const authApi = new AuthApi(clientConfig)

export interface LegacyBookmarksResponse {
  page: number
  maxPage: number
  bookmarks: ModelBookmarkDTO[]
}

export interface ListBookmarksParams {
  page?: number
  keyword?: string
  tags?: string[]
  exclude?: string[]
}

export interface CreateBookmarkInput {
  url: string
  title?: string
  excerpt?: string
  tags?: string[]
  createArchive?: boolean
  createEbook?: boolean
  public?: number
  async?: boolean
}

type MessageEnvelope<T> = {
  ok?: boolean
  message?: T | { error?: string } | string
  error?: string
}

function getErrorText(payload: unknown, fallback: string): string {
  if (!payload) return fallback

  if (typeof payload === 'string') {
    return payload || fallback
  }

  if (typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    const directError = record.error
    if (typeof directError === 'string' && directError.trim()) return directError

    const message = record.message
    if (typeof message === 'string' && message.trim()) return message

    if (message && typeof message === 'object') {
      const nestedError = (message as Record<string, unknown>).error
      if (typeof nestedError === 'string' && nestedError.trim()) return nestedError
    }
  }

  return fallback
}

function unwrapMessageEnvelope<T>(payload: unknown): T | unknown {
  if (!payload || typeof payload !== 'object') {
    return payload
  }

  const envelope = payload as MessageEnvelope<T>
  const hasEnvelopeShape = 'ok' in envelope || 'message' in envelope
  if (!hasEnvelopeShape) {
    return payload
  }

  if (envelope.ok === false) {
    throw new Error(getErrorText(envelope, 'Request failed.'))
  }

  if ('message' in envelope) {
    return envelope.message as T
  }

  return payload
}

async function parseResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    const text = await response.text()
    return text || null
  }

  return response.json() as Promise<unknown>
}

async function readApiResponse<T>(response: Response, fallbackError: string): Promise<T> {
  const payload = await parseResponseBody(response)

  if (!response.ok) {
    throw new Error(getErrorText(payload, `${fallbackError} (${response.status})`))
  }

  const data = unwrapMessageEnvelope<T>(payload)
  return data as T
}

function createApiUrl(path: string): string {
  if (!API_BASE) {
    return path
  }

  return new URL(path, API_BASE).toString()
}

function createRequestHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    ...getGlobalHeaders(),
    ...extra,
  }
}

export async function listBookmarks(params: ListBookmarksParams = {}): Promise<LegacyBookmarksResponse> {
  const query = new URLSearchParams()

  if (params.page) query.set('page', String(params.page))
  if (params.keyword) query.set('keyword', params.keyword)
  if (params.tags?.length) query.set('tags', params.tags.join(','))
  if (params.exclude?.length) query.set('exclude', params.exclude.join(','))

  const queryString = query.toString()
  const endpoint = `/api/bookmarks${queryString ? `?${queryString}` : ''}`

  const response = await fetch(createApiUrl(endpoint), {
    method: 'GET',
    credentials: 'include',
    headers: createRequestHeaders(),
  })

  const data = await readApiResponse<LegacyBookmarksResponse>(response, 'Failed to load bookmarks')

  if (!data || !Array.isArray(data.bookmarks)) {
    throw new Error('Failed to load bookmarks: invalid response format.')
  }

  return {
    page: typeof data.page === 'number' ? data.page : 1,
    maxPage: typeof data.maxPage === 'number' ? data.maxPage : 1,
    bookmarks: data.bookmarks,
  }
}

export async function createBookmark(input: CreateBookmarkInput): Promise<ModelBookmarkDTO> {
  const response = await fetch(createApiUrl('/api/bookmarks'), {
    method: 'POST',
    credentials: 'include',
    headers: createRequestHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      url: input.url,
      title: input.title ?? '',
      excerpt: input.excerpt ?? '',
      tags: (input.tags ?? [])
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => ({ name })),
      create_archive: input.createArchive ?? false,
      create_ebook: input.createEbook ?? false,
      public: input.public ?? 0,
      async: input.async ?? true,
    }),
  })

  const data = await readApiResponse<ModelBookmarkDTO>(response, 'Failed to create bookmark')

  if (!data || typeof data !== 'object' || !('url' in data)) {
    throw new Error('Failed to create bookmark: invalid response format.')
  }

  return data
}

export async function uploadPdfBookmark(file: File, input: { title?: string; tags?: string[] } = {}): Promise<ModelBookmarkDTO> {
  const formData = new FormData()
  formData.append('file', file)

  if (input.title?.trim()) {
    formData.append('title', input.title.trim())
  }

  if (input.tags?.length) {
    formData.append('tags', input.tags.map((tag) => tag.trim()).filter(Boolean).join(','))
  }

  const response = await fetch(createApiUrl('/api/bookmarks/pdf'), {
    method: 'POST',
    credentials: 'include',
    headers: createRequestHeaders(),
    body: formData,
  })

  const data = await readApiResponse<ModelBookmarkDTO>(response, 'Failed to upload PDF bookmark')

  if (!data || typeof data !== 'object' || !('url' in data)) {
    throw new Error('Failed to upload PDF bookmark: invalid response format.')
  }

  return data
}

export async function deleteBookmark(id: number): Promise<void> {
  const response = await fetch(createApiUrl('/api/bookmarks'), {
    method: 'DELETE',
    credentials: 'include',
    headers: createRequestHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify([id]),
  })

  await readApiResponse<unknown>(response, 'Failed to delete bookmark')
}

async function updateBookmark(bookmark: ModelBookmarkDTO, tags: ModelTagDTO[], actionLabel: string): Promise<ModelBookmarkDTO> {
  const response = await fetch(createApiUrl('/api/bookmarks'), {
    method: 'PUT',
    credentials: 'include',
    headers: createRequestHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      ...bookmark,
      tags,
    }),
  })

  const data = await readApiResponse<ModelBookmarkDTO>(response, actionLabel)

  if (!data || typeof data !== 'object' || !('url' in data)) {
    throw new Error(`${actionLabel}: invalid response format.`)
  }

  return data
}

async function getOrCreateTagByName(tagName: string): Promise<ModelTagDTO> {
  const normalizedName = tagName.trim().toLowerCase()
  if (!normalizedName) {
    throw new Error('Failed to update bookmark tags: invalid tag name')
  }

  const searchRes = await fetch(createApiUrl(`/api/v1/tags?search=${encodeURIComponent(normalizedName)}`), {
    method: 'GET',
    credentials: 'include',
    headers: createRequestHeaders(),
  })
  const existingTags = await readApiResponse<ModelTagDTO[]>(searchRes, 'Failed to search tags')
  const exactMatch = existingTags.find((tag) => tag.name?.trim().toLowerCase() === normalizedName)
  if (exactMatch) {
    return exactMatch
  }

  const createRes = await fetch(createApiUrl('/api/v1/tags'), {
    method: 'POST',
    credentials: 'include',
    headers: createRequestHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ name: normalizedName }),
  })
  return readApiResponse<ModelTagDTO>(createRes, 'Failed to create tag')
}

export async function toggleBookmarkTagByName(bookmark: ModelBookmarkDTO, tagName: string): Promise<ModelBookmarkDTO> {
  if (!bookmark.id) {
    throw new Error('Failed to update bookmark tags: bookmark id is required')
  }

  const normalizedTag = tagName.trim().toLowerCase()
  if (!normalizedTag) {
    throw new Error('Failed to update bookmark tags: invalid tag name')
  }

  const tagsRes = await fetch(createApiUrl(`/api/v1/bookmarks/${bookmark.id}/tags`), {
    method: 'GET',
    credentials: 'include',
    headers: createRequestHeaders(),
  })
  const currentTags = await readApiResponse<ModelTagDTO[]>(tagsRes, 'Failed to get bookmark tags')
  const existingTag = currentTags.find((tag) => tag.name?.trim().toLowerCase() === normalizedTag)

  if (existingTag?.id) {
    const deleteRes = await fetch(createApiUrl(`/api/v1/bookmarks/${bookmark.id}/tags`), {
      method: 'DELETE',
      credentials: 'include',
      headers: createRequestHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ tag_id: existingTag.id }),
    })
    if (!deleteRes.ok) {
      throw new Error(`Failed to remove tag (${deleteRes.status})`)
    }
  } else {
    const tag = await getOrCreateTagByName(normalizedTag)
    if (!tag.id) {
      throw new Error('Failed to update bookmark tags: tag id is required')
    }

    const addRes = await fetch(createApiUrl(`/api/v1/bookmarks/${bookmark.id}/tags`), {
      method: 'POST',
      credentials: 'include',
      headers: createRequestHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ tag_id: tag.id }),
    })
    if (!addRes.ok) {
      throw new Error(`Failed to add tag (${addRes.status})`)
    }
  }

  const refreshRes = await fetch(createApiUrl(`/api/v1/bookmarks/${bookmark.id}/tags`), {
    method: 'GET',
    credentials: 'include',
    headers: createRequestHeaders(),
  })
  const refreshedTags = await readApiResponse<ModelTagDTO[]>(refreshRes, 'Failed to refresh bookmark tags')
  return {
    ...bookmark,
    tags: refreshedTags,
  }
}

export async function archiveBookmark(bookmark: ModelBookmarkDTO): Promise<ModelBookmarkDTO> {
  const tags = bookmark.tags ? [...bookmark.tags] : []
  const hasArchiveTag = tags.some((tag) => tag.name?.toLowerCase() === 'archive')

  if (!hasArchiveTag) {
    tags.push({ name: 'archive' } as ModelTagDTO)
  }

  return updateBookmark(bookmark, tags, 'Failed to archive bookmark')
}

export async function unarchiveBookmark(bookmark: ModelBookmarkDTO): Promise<ModelBookmarkDTO> {
  const tags = (bookmark.tags ?? []).filter((tag) => tag.name?.toLowerCase() !== 'archive')
  return updateBookmark(bookmark, tags, 'Failed to restore bookmark')
}

export async function listAllBookmarks(): Promise<ModelBookmarkDTO[]> {
  const all: ModelBookmarkDTO[] = []
  let page = 1

  while (true) {
    const response = await listBookmarks({ page })
    all.push(...response.bookmarks)

    if (page >= response.maxPage) break
    page++
  }

  return all
}

export interface UpdateBookmarksCacheInput {
  ids: number[]
  keepMetadata: boolean
  createArchive: boolean
  createEbook: boolean
  skipExist: boolean
}

export async function updateBookmarksCache(input: UpdateBookmarksCacheInput): Promise<ModelBookmarkDTO[]> {
  const response = await fetch(createApiUrl('/api/v1/bookmarks/cache'), {
    method: 'PUT',
    credentials: 'include',
    headers: createRequestHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      ids: input.ids,
      keep_metadata: input.keepMetadata,
      create_archive: input.createArchive,
      create_ebook: input.createEbook,
      skip_exist: input.skipExist,
    }),
  })

  return readApiResponse<ModelBookmarkDTO[]>(response, 'Failed to update bookmarks cache')
}

export async function removeArchiveTag(bookmarkId: number, tagId: number): Promise<void> {
  const res = await fetch(createApiUrl(`/api/v1/bookmarks/${bookmarkId}/tags`), {
    method: 'DELETE',
    credentials: 'include',
    headers: createRequestHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ tag_id: tagId }),
  })
  if (!res.ok) {
    throw new Error(`Failed to remove tag (${res.status})`)
  }
}
