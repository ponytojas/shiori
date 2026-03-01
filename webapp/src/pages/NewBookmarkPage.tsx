import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function NewBookmarkPage() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Add bookmark</h1>
        <p className="text-sm text-muted-foreground">Form shell for create bookmark endpoint integration.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New link</CardTitle>
          <CardDescription>Submit handler to be connected to existing generated API client.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input id="url" type="url" placeholder="https://example.com/article" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title (optional)</Label>
              <Input id="title" placeholder="Helpful article" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input id="tags" placeholder="research, productivity" />
            </div>
            <Button type="button">Save bookmark</Button>
          </form>
        </CardContent>
      </Card>
    </section>
  )
}
