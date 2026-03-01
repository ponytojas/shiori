import { Archive, Bookmark, PlusCircle, Settings } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import type { PropsWithChildren } from 'react'
import { cn } from '@/lib/utils'

const links = [
  { to: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
  { to: '/bookmarks/new', label: 'Add', icon: PlusCircle },
  { to: '/archive', label: 'Archive', icon: Archive },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function AppLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="text-sm font-semibold uppercase tracking-wide text-primary">Shiori</div>
          <div className="text-xs text-muted-foreground">React foundation</div>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-6 p-4 md:grid-cols-[220px_1fr]">
        <aside className="rounded-xl border bg-card p-2">
          <nav className="space-y-1">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  )
}
