import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ModelBookmarkDTO } from '@/client'
import { archiveBookmark, createBookmark, deleteBookmark, listBookmarks, tagsApi, unarchiveBookmark, updateBookmarkTagsByName, uploadPdfBookmark } from '@/lib/api'
import { getBookmarkTagNames } from '@/lib/operational-reading'

export const bookmarkKeys = {
  all: ['bookmarks'] as const,
  list: (params: { archived?: boolean; keyword?: string; tags?: string[]; exclude?: string[] }) => [...bookmarkKeys.all, params] as const,
  tags: ['tags'] as const,
}

function isArchived(bookmark: ModelBookmarkDTO): boolean {
  return (bookmark.tags ?? []).some((tag) => tag.name?.toLowerCase() === 'archive')
}

export interface UseBookmarksQueryOptions {
  archived?: boolean
  keyword?: string
  tags?: string[]
  exclude?: string[]
}

function normalizeQueryOptions(options: UseBookmarksQueryOptions) {
  const normalizeList = (values?: string[]) =>
    values
      ?.map((value) => value.trim())
      .filter(Boolean)
      .sort() ?? []

  return {
    archived: options.archived ?? false,
    keyword: options.keyword?.trim() ?? '',
    tags: normalizeList(options.tags),
    exclude: normalizeList(options.exclude),
  }
}

export function useBookmarksQuery(optionsOrArchived: boolean | UseBookmarksQueryOptions = false) {
  const options = typeof optionsOrArchived === 'boolean' ? { archived: optionsOrArchived } : optionsOrArchived
  const normalizedOptions = normalizeQueryOptions(options)

  return useQuery({
    queryKey: bookmarkKeys.list(normalizedOptions),
    queryFn: async () => {
      const response = await listBookmarks({
        keyword: normalizedOptions.keyword || undefined,
        tags: normalizedOptions.tags,
        exclude: normalizedOptions.exclude,
      })

      return response.bookmarks.filter((bookmark) => isArchived(bookmark) === normalizedOptions.archived)
    },
  })
}

export function useTagsQuery() {
  return useQuery({
    queryKey: bookmarkKeys.tags,
    queryFn: () => tagsApi.apiV1TagsGet({ withBookmarkCount: true }),
  })
}

export function useCreateBookmarkMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createBookmark,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: bookmarkKeys.all })
      await queryClient.invalidateQueries({ queryKey: bookmarkKeys.tags })
    },
  })
}

export function useUploadPdfBookmarkMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { file: File; title?: string; tags?: string[] }) =>
      uploadPdfBookmark(payload.file, { title: payload.title, tags: payload.tags }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: bookmarkKeys.all })
      await queryClient.invalidateQueries({ queryKey: bookmarkKeys.tags })
    },
  })
}

export function useDeleteBookmarkMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (bookmarkId: number) => deleteBookmark(bookmarkId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: bookmarkKeys.all })
      await queryClient.invalidateQueries({ queryKey: bookmarkKeys.tags })
    },
  })
}

export function useArchiveBookmarkMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (bookmark: ModelBookmarkDTO) => archiveBookmark(bookmark),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: bookmarkKeys.all })
      await queryClient.invalidateQueries({ queryKey: bookmarkKeys.tags })
    },
  })
}

export function useUnarchiveBookmarkMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (bookmark: ModelBookmarkDTO) => unarchiveBookmark(bookmark),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: bookmarkKeys.all })
      await queryClient.invalidateQueries({ queryKey: bookmarkKeys.tags })
    },
  })
}

export function useOperationalTagToggleMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { bookmark: ModelBookmarkDTO; tagName: string }) => {
      const currentTags = getBookmarkTagNames(payload.bookmark)
      const normalizedTag = payload.tagName.trim().toLowerCase()

      const nextTags = currentTags.includes(normalizedTag)
        ? currentTags.filter((tag) => tag !== normalizedTag)
        : [...currentTags, normalizedTag]

      return updateBookmarkTagsByName(payload.bookmark, nextTags)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: bookmarkKeys.all })
      await queryClient.invalidateQueries({ queryKey: bookmarkKeys.tags })
    },
  })
}
