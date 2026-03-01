import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { authApi } from '@/lib/api'
import { clearStoredToken, getStoredToken } from '@/lib/auth'
import { ArchivePage } from '@/pages/ArchivePage'
import { BookmarksPage } from '@/pages/BookmarksPage'
import { LoginPage } from '@/pages/LoginPage'
import { NewBookmarkPage } from '@/pages/NewBookmarkPage'
import { SettingsPage } from '@/pages/SettingsPage'

export default function App() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function bootstrapAuth() {
      const token = getStoredToken()

      if (!token) {
        if (isMounted) {
          setIsAuthenticated(false)
          setIsCheckingAuth(false)
        }
        return
      }

      try {
        await authApi.apiV1AuthMeGet()
        if (isMounted) {
          setIsAuthenticated(true)
        }
      } catch {
        clearStoredToken()
        if (isMounted) {
          setIsAuthenticated(false)
        }
      } finally {
        if (isMounted) {
          setIsCheckingAuth(false)
        }
      }
    }

    void bootstrapAuth()

    return () => {
      isMounted = false
    }
  }, [])

  if (isCheckingAuth) {
    return <div className="p-6 text-sm text-muted-foreground">Checking session…</div>
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/bookmarks" replace />} />
        <Route path="/login" element={<Navigate to="/bookmarks" replace />} />
        <Route path="/bookmarks" element={<BookmarksPage />} />
        <Route path="/bookmarks/new" element={<NewBookmarkPage />} />
        <Route path="/archive" element={<ArchivePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </AppLayout>
  )
}
