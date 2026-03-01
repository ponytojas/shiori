import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useBookmarksQuery, useDeleteBookmarkMutation, useUnarchiveBookmarkMutation } from '@/lib/bookmarks-query'

export function ArchivePage() {
  const bookmarksQuery = useBookmarksQuery(true)
  const unarchiveMutation = useUnarchiveBookmarkMutation()
  const deleteMutation = useDeleteBookmarkMutation()

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Archive</h1>
        <p className="text-sm text-muted-foreground">Bookmarks tagged as archive.</p>
      </div>

      {bookmarksQuery.isLoading && <p className="text-sm text-muted-foreground">Loading archive...</p>}
      {bookmarksQuery.error && <p className="text-sm text-red-600">Failed to load archived bookmarks.</p>}

      {bookmarksQuery.data?.length === 0 && !bookmarksQuery.isLoading ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">No archived bookmarks yet.</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4">
        {bookmarksQuery.data?.map((bookmark) => (
          <Card key={bookmark.id ?? bookmark.url}>
            <CardHeader>
              <CardTitle>{bookmark.title || bookmark.url}</CardTitle>
              <CardDescription>{bookmark.url}</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!bookmark.id || unarchiveMutation.isPending}
                onClick={() => unarchiveMutation.mutate(bookmark)}
              >
                Restore
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
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
