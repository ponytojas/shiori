import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function ArchivePage() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Archive</h1>
        <p className="text-sm text-muted-foreground">Archived bookmarks view shell.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Archived items</CardTitle>
          <CardDescription>Filter controls and pagination will be added in next iterations.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">No data wired yet. Ready for API integration.</CardContent>
      </Card>
    </section>
  )
}
