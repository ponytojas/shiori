import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateBookmarkMutation, useTagsQuery } from '@/lib/bookmarks-query'

export function NewBookmarkPage() {
  const navigate = useNavigate()
  const tagsQuery = useTagsQuery()
  const createMutation = useCreateBookmarkMutation()

  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!url.trim()) {
      return
    }

    await createMutation.mutateAsync({
      url: url.trim(),
      title: title.trim(),
      tags: tags
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    })

    navigate('/bookmarks')
  }

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Add bookmark</h1>
        <p className="text-sm text-muted-foreground">Create a new bookmark in Shiori.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New link</CardTitle>
          <CardDescription>URL is required. Title and tags are optional.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input id="url" type="url" placeholder="https://example.com/article" value={url} onChange={(event) => setUrl(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title (optional)</Label>
              <Input id="title" placeholder="Helpful article" value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input id="tags" placeholder="research, productivity" value={tags} onChange={(event) => setTags(event.target.value)} />
            </div>

            {tagsQuery.data?.length ? (
              <p className="text-xs text-muted-foreground">Existing tags: {tagsQuery.data.map((tag) => tag.name).filter(Boolean).join(', ')}</p>
            ) : null}

            {createMutation.isError ? <p className="text-sm text-red-600">Failed to save bookmark.</p> : null}

            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Saving...' : 'Save bookmark'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  )
}
