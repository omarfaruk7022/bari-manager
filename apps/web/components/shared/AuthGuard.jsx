'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export function AuthGuard({ children, role }) {
  const router = useRouter()
  const { user, loading } = useAuth()
  const allowedRoles = Array.isArray(role) ? role : role ? [role] : []

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/login'); return }
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      const map = { admin: '/admin/dashboard', landlord: '/landlord/dashboard', tenant: '/tenant/dashboard' }
      router.replace(map[user.role] || '/login')
    }
  }, [user, loading, role, router, allowedRoles])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500">লোড হচ্ছে...</p>
      </div>
    </div>
  )

  if (!user || (allowedRoles.length > 0 && !allowedRoles.includes(user.role))) return null

  return children
}
