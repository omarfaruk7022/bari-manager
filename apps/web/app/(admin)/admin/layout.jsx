import { AuthGuard } from '@/components/shared/AuthGuard'
import { BottomNav } from '@/components/shared/BottomNav'
import { TopBar } from '@/components/shared/TopBar'

export default function AdminLayout({ children }) {
  return (
    <AuthGuard role="admin">
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <TopBar />
        <main className="flex-1 pb-24 pt-2">
          <div className="max-w-2xl mx-auto px-4">
            {children}
          </div>
        </main>
        <BottomNav role="admin" />
      </div>
    </AuthGuard>
  )
}
