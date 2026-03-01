import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const placeholderBookmarks = [
  { title: 'Shiori docs', url: 'https://github.com/go-shiori/shiori' },
  { title: 'React + Vite guide', url: 'https://vite.dev/guide/' },
]

export function BookmarksPage() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Bookmarks</h1>
        <p className="text-sm text-muted-foreground">List shell ready to be connected to Shiori API client.</p>
      </div>

      <div className="grid gap-4">
        {placeholderBookmarks.map((bookmark) => (
          <Card key={bookmark.url}>
            <CardHeader>
              <CardTitle>{bookmark.title}</CardTitle>
              <CardDescription>{bookmark.url}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Tags, excerpt, reading state and actions will go here.</CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
