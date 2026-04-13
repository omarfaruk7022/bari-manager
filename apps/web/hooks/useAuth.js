'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredUser, logout as authLogout } from '@/lib/auth'

export function useAuth() {
  const router = useRouter()
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = getStoredUser()
    setUser(stored)
    setLoading(false)
  }, [])

  const logout = useCallback(() => {
    authLogout()
    setUser(null)
    router.push('/login')
  }, [router])

  return { user, loading, logout }
}
