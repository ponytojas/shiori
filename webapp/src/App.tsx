import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ArchivePage } from '@/pages/ArchivePage'
import { BookmarksPage } from '@/pages/BookmarksPage'
import { NewBookmarkPage } from '@/pages/NewBookmarkPage'
import { SettingsPage } from '@/pages/SettingsPage'

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/bookmarks" replace />} />
        <Route path="/bookmarks" element={<BookmarksPage />} />
        <Route path="/bookmarks/new" element={<NewBookmarkPage />} />
        <Route path="/archive" element={<ArchivePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </AppLayout>
  )
}
