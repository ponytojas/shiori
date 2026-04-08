import { useCallback, useEffect, useState } from 'react'
import type { ModelBookmarkDTO } from '@/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { listAllBookmarks } from '@/lib/api'
import { useUpdateBookmarksCacheMutation } from '@/lib/bookmarks-query'

export function MaintenancePage() {
  const [allBookmarks, setAllBookmarks] = useState<ModelBookmarkDTO[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [activeOp, setActiveOp] = useState<'titles' | 'archives' | null>(null)

  const updateCacheMutation = useUpdateBookmarksCacheMutation()

  const fetchAll = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const bookmarks = await listAllBookmarks()
      setAllBookmarks(bookmarks)
    } catch {
      setError('Failed to load bookmarks.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchAll()
  }, [fetchAll])

  useEffect(() => {
    if (!result) return
    const timer = window.setTimeout(() => setResult(null), 4000)
    return () => window.clearTimeout(timer)
  }, [result])

  const missingTitles = allBookmarks.filter((b) => {
    const title = (b.title ?? '').trim()
    const url = (b.url ?? '').trim()
    if (!url) return false
    if (!title) return true
    // Normalize: strip protocol, trailing slashes, www prefix, lowercase
    const normalize = (s: string) =>
      s.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '').toLowerCase()
    return normalize(title) === normalize(url)
  })

  const missingArchives = allBookmarks.filter((b) => !b.hasArchive)

  const handleRefreshTitles = async () => {
    const ids = missingTitles.map((b) => b.id).filter((id): id is number => id != null)
    if (ids.length === 0) return

    setResult(null)
    setActiveOp('titles')
    try {
      await updateCacheMutation.mutateAsync({
        ids,
        keepMetadata: false,
        createArchive: false,
        createEbook: false,
        skipExist: true,
      })
      setResult(`Refreshed titles for ${ids.length} bookmark(s).`)
      void fetchAll()
    } catch {
      setResult('Failed to refresh titles.')
    } finally {
      setActiveOp(null)
    }
  }

  const handleCreateArchives = async () => {
    const ids = missingArchives.map((b) => b.id).filter((id): id is number => id != null)
    if (ids.length === 0) return

    setResult(null)
    setActiveOp('archives')
    try {
      await updateCacheMutation.mutateAsync({
        ids,
        keepMetadata: true,
        createArchive: true,
        createEbook: false,
        skipExist: true,
      })
      setResult(`Created archives for ${ids.length} bookmark(s).`)
      void fetchAll()
    } catch {
      setResult('Failed to create archives.')
    } finally {
      setActiveOp(null)
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Maintenance</h1>
        <p className="text-sm text-muted-foreground">Batch operations to fix missing data across your bookmarks.</p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Refresh Missing Titles</CardTitle>
          <CardDescription>
            {isLoading
              ? 'Scanning bookmarks...'
              : `${missingTitles.length} bookmark(s) have no proper title (title equals URL).`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleRefreshTitles}
            disabled={isLoading || missingTitles.length === 0 || activeOp !== null}
          >
            {activeOp === 'titles' ? 'Refreshing...' : 'Refresh Titles'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create Missing Archives</CardTitle>
          <CardDescription>
            {isLoading
              ? 'Scanning bookmarks...'
              : `${missingArchives.length} bookmark(s) are missing an offline archive.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleCreateArchives}
            disabled={isLoading || missingArchives.length === 0 || activeOp !== null}
          >
            {activeOp === 'archives' ? 'Creating...' : 'Create Archives'}
          </Button>
        </CardContent>
      </Card>

      {result ? (
        <div className="fixed bottom-4 right-4 rounded border bg-background px-3 py-1.5 text-sm text-muted-foreground shadow-sm">
          {result}
        </div>
      ) : null}
    </section>
  )
}
