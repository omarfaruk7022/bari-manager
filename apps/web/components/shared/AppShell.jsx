"use client"

import { AuthGuard } from '@/components/shared/AuthGuard'
import { BottomNav } from '@/components/shared/BottomNav'
import { DesktopNav } from '@/components/shared/DesktopNav'
import { GoogleAdSlot } from '@/components/shared/GoogleAdSlot'
import { TopBar } from '@/components/shared/TopBar'
import { useQuery } from '@tanstack/react-query'
import { request } from '@/lib/query'

export function AppShell({ role, children }) {
  const navRole = Array.isArray(role) ? role[0] : role
  const { data: me } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => request({ url: '/auth/me' }),
  })
  const ads = me?.googleAds

  return (
    <AuthGuard role={role}>
      <div className="min-h-screen bg-gray-50 pb-10">
        <TopBar />
        <main className="pb-24 pt-4 lg:pb-10">
          <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 lg:px-6">
            <DesktopNav role={navRole} />
            <div className="min-w-0 flex-1">
              {ads?.active && (navRole === 'landlord' || navRole === 'tenant') && (
                <div className="mb-4">
                  <GoogleAdSlot
                    clientId={ads.clientId}
                    slotId={ads.slotId}
                    layout={ads.layout}
                  />
                </div>
              )}
              {children}
            </div>
          </div>
        </main>
        <BottomNav role={navRole} />
      </div>
    </AuthGuard>
  )
}
