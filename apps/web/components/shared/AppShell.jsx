import { AuthGuard } from '@/components/shared/AuthGuard'
import { BottomNav } from '@/components/shared/BottomNav'
import { DesktopNav } from '@/components/shared/DesktopNav'
import { TopBar } from '@/components/shared/TopBar'

export function AppShell({ role, children }) {
  const navRole = Array.isArray(role) ? role[0] : role

  return (
    <AuthGuard role={role}>
      <div className="min-h-screen bg-gray-50">
        <TopBar />
        <main className="pb-24 pt-4 lg:pb-10">
          <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 lg:px-6">
            <DesktopNav role={navRole} />
            <div className="min-w-0 flex-1">
              {children}
            </div>
          </div>
        </main>
        <BottomNav role={navRole} />
      </div>
    </AuthGuard>
  )
}
