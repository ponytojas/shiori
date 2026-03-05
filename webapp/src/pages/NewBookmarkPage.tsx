import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateBookmarkMutation, useTagsQuery, useUploadPdfBookmarkMutation } from '@/lib/bookmarks-query'

export function NewBookmarkPage() {
  const navigate = useNavigate()
  const tagsQuery = useTagsQuery()
  const createMutation = useCreateBookmarkMutation()
  const uploadPdfMutation = useUploadPdfBookmarkMutation()

  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfTitle, setPdfTitle] = useState('')
  const [pdfTags, setPdfTags] = useState('')

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

  const submitPdf = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!pdfFile) {
      return
    }

    await uploadPdfMutation.mutateAsync({
      file: pdfFile,
      title: pdfTitle.trim(),
      tags: pdfTags
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

      <Card>
        <CardHeader>
          <CardTitle>Upload PDF</CardTitle>
          <CardDescription>Sube un PDF para guardarlo en Shiori como bookmark.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submitPdf}>
            <div className="space-y-2">
              <Label htmlFor="pdf-file">PDF file</Label>
              <Input
                id="pdf-file"
                type="file"
                accept="application/pdf,.pdf"
                onChange={(event) => setPdfFile(event.target.files?.[0] ?? null)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pdf-title">Title (optional)</Label>
              <Input id="pdf-title" placeholder="Whitepaper IA" value={pdfTitle} onChange={(event) => setPdfTitle(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pdf-tags">Tags (comma separated)</Label>
              <Input id="pdf-tags" placeholder="pdf, research" value={pdfTags} onChange={(event) => setPdfTags(event.target.value)} />
            </div>

            {uploadPdfMutation.isError ? <p className="text-sm text-red-600">Failed to upload PDF.</p> : null}

            <Button type="submit" disabled={uploadPdfMutation.isPending || !pdfFile}>
              {uploadPdfMutation.isPending ? 'Uploading...' : 'Upload PDF'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  )
}
