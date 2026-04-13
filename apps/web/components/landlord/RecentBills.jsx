'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { BillCard } from './BillCard'

export function RecentBills() {
  const router = useRouter()
  const [bills, setBills]   = useState([])
  const [loading, setLoading] = useState(true)

  const now   = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`

  useEffect(() => {
    api.get(`/landlord/bills?month=${month}&limit=3`)
      .then(r => setBills(r.data.data.slice(0, 3)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
  if (!bills.length) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-700">সাম্প্রতিক বিল</h2>
        <button onClick={() => router.push('/landlord/bills')} className="text-sm text-green-600 font-medium">
          সব দেখুন
        </button>
      </div>
      <div className="space-y-3">
        {bills.map(b => <BillCard key={b._id} bill={b} role="landlord" onRefresh={() => {}} />)}
      </div>
    </div>
  )
}
