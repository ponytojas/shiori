import { AuthApi, Configuration, TagsApi, type ModelBookmarkDTO, type ModelTagDTO, type ApiV1BookmarkTagPayload } from '@/client'
import { getStoredToken } from '@/lib/auth'

const rawApiBase = import.meta.env.VITE_API_BASE_URL?.trim() ?? ''
const isAbsoluteApiBase = /^https?:\/\//i.test(rawApiBase)

// In dev, keep requests same-origin so Vite proxy can forward /api calls and avoid browser CORS issues.
const API_BASE = import.meta.env.DEV && isAbsoluteApiBase ? '' : rawApiBase

const CONTROL_HEADER_NAME = import.meta.env.VITE_API_CONTROL_HEADER_NAME?.trim() ?? ''
const CONTROL_HEADER_VALUE = import.meta.env.VITE_API_CONTROL_HEADER_VALUE?.trim() ?? ''

function getGlobalHeaders(): Record<string, string> {
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

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed: ${response.status}`)
  }

  return response.json() as Promise<T>
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

  return readJson<LegacyBookmarksResponse>(response)
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

  return readJson<ModelBookmarkDTO>(response)
}

export async function deleteBookmark(id: number): Promise<void> {
  const response = await fetch(createApiUrl('/api/bookmarks'), {
    method: 'DELETE',
    credentials: 'include',
    headers: createRequestHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify([id]),
  })

  if (!response.ok) {
    throw new Error((await response.text()) || `Request failed: ${response.status}`)
  }
}

export async function archiveBookmark(bookmark: ModelBookmarkDTO): Promise<ModelBookmarkDTO> {
  const tags = bookmark.tags ? [...bookmark.tags] : []
  const hasArchiveTag = tags.some((tag) => tag.name?.toLowerCase() === 'archive')

  if (!hasArchiveTag) {
    tags.push({ name: 'archive' } as ModelTagDTO)
  }

  const response = await fetch(createApiUrl('/api/bookmarks'), {
    method: 'PUT',
    credentials: 'include',
    headers: createRequestHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      ...bookmark,
      tags,
    }),
  })

  return readJson<ModelBookmarkDTO>(response)
}

export async function unarchiveBookmark(bookmark: ModelBookmarkDTO): Promise<ModelBookmarkDTO> {
  const tags = (bookmark.tags ?? []).filter((tag) => tag.name?.toLowerCase() !== 'archive')

  const response = await fetch(createApiUrl('/api/bookmarks'), {
    method: 'PUT',
    credentials: 'include',
    headers: createRequestHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      ...bookmark,
      tags,
    }),
  })

  return readJson<ModelBookmarkDTO>(response)
}

export async function removeArchiveTag(bookmarkId: number, tagId: number): Promise<void> {
  const payload: ApiV1BookmarkTagPayload = { tagId }
  await authApi.apiV1BookmarksIdTagsDelete({
    id: bookmarkId,
    payload,
  })
}
