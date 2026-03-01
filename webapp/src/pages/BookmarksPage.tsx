import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useArchiveBookmarkMutation, useBookmarksQuery, useDeleteBookmarkMutation, useTagsQuery } from '@/lib/bookmarks-query'

export function BookmarksPage() {
  const bookmarksQuery = useBookmarksQuery(false)
  const tagsQuery = useTagsQuery()
  const archiveMutation = useArchiveBookmarkMutation()
  const deleteMutation = useDeleteBookmarkMutation()

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Bookmarks</h1>
        <p className="text-sm text-muted-foreground">Saved links from Shiori.</p>
      </div>

      {bookmarksQuery.isLoading && <p className="text-sm text-muted-foreground">Loading bookmarks...</p>}
      {bookmarksQuery.error && <p className="text-sm text-red-600">Failed to load bookmarks.</p>}
      {tagsQuery.error && <p className="text-sm text-red-600">Failed to load tags.</p>}

      {bookmarksQuery.data?.length === 0 && !bookmarksQuery.isLoading ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">No active bookmarks yet.</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4">
        {bookmarksQuery.data?.map((bookmark) => (
          <Card key={bookmark.id ?? bookmark.url}>
            <CardHeader>
              <CardTitle>{bookmark.title || bookmark.url}</CardTitle>
              <CardDescription>{bookmark.url}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">
                {(bookmark.tags ?? []).map((tag) => tag.name).filter(Boolean).join(', ') || 'No tags'}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!bookmark.id || archiveMutation.isPending}
                  onClick={() => {
                    archiveMutation.mutate(bookmark)
                  }}
                >
                  Archive
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!bookmark.id || deleteMutation.isPending}
                  onClick={() => {
                    if (!bookmark.id) return
                    deleteMutation.mutate(bookmark.id)
                  }}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
