import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ModelBookmarkDTO } from '@/client'
import { archiveBookmark, createBookmark, deleteBookmark, listBookmarks, tagsApi, unarchiveBookmark, uploadPdfBookmark } from '@/lib/api'

export const bookmarkKeys = {
  all: ['bookmarks'] as const,
  list: (params: { archived?: boolean }) => [...bookmarkKeys.all, params] as const,
  tags: ['tags'] as const,
}

function isArchived(bookmark: ModelBookmarkDTO): boolean {
  return (bookmark.tags ?? []).some((tag) => tag.name?.toLowerCase() === 'archive')
}

export function useBookmarksQuery(archived = false) {
  return useQuery({
    queryKey: bookmarkKeys.list({ archived }),
    queryFn: async () => {
      const response = await listBookmarks()
      return response.bookmarks.filter((bookmark) => isArchived(bookmark) === archived)
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
