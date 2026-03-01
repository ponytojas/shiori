import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

export function SettingsPage() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Preferences shell for frontend config and user options.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>This section is a scaffold to be connected to persisted settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiBase">API base URL</Label>
            <Input id="apiBase" placeholder="/api/v1" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="theme">Theme preference</Label>
            <Input id="theme" placeholder="system / light / dark" />
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
