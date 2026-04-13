'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import api from '@/lib/api'

export function TopBar() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!user) return
    api.get('/auth/me')
      .then(r => setUnread(r.data.unreadNotifications || 0))
      .catch(() => {})
  }, [user])

  const notifPath = user?.role === 'tenant' ? '/tenant/notices'
    : user?.role === 'landlord' ? '/landlord/notices'
    : '/admin/dashboard'

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">বা</span>
          </div>
          <span className="font-bold text-gray-900 text-lg">BariManager</span>
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
