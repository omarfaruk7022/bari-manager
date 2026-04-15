'use client'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { BillCard } from './BillCard'
import { request } from '@/lib/query'

export function RecentBills() {
  const router = useRouter()

  const now   = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
  const { data: bills = [], isLoading: loading } = useQuery({
    queryKey: ['landlord', 'recent-bills', month],
    queryFn: async () => {
      const data = await request({ url: `/landlord/bills?month=${month}&limit=3` })
      return data.slice(0, 3)
    },
  })

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
        {bills.map(b => <BillCard key={b._id} bill={b} role="landlord" queryKey={['landlord', 'recent-bills', month]} />)}
      </div>
    </div>
  )
}
