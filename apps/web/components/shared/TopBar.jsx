'use client'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Bell, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { request } from '@/lib/query'

export function TopBar() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const { data: me } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => request({ url: '/auth/me' }),
    enabled: !!user,
  })
  const unread = me?.unreadNotifications || 0

  const notifPath = user?.role === 'tenant' ? '/tenant/notices'
    : user?.role === 'landlord' ? '/landlord/notices'
    : '/admin/dashboard'

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 lg:px-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-600">
            <span className="text-white text-sm font-bold">বা</span>
          </div>
          <div>
            <span className="block text-lg font-bold text-gray-900">BariManager</span>
            <span className="hidden text-xs text-gray-500 lg:block">ভাড়া ব্যবস্থাপনা</span>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Notification bell */}
          <button
            onClick={() => router.push(notifPath)}
            className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100"
          >
            <Bell size={22} />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100"
          >
            <LogOut size={22} />
          </button>
        </div>
      </div>
    </header>
  )
}