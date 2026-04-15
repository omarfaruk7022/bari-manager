'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BillCard } from '@/components/landlord/BillCard'
import { request } from '@/lib/query'

export default function TenantBillsPage() {
  const now = new Date()
  const [month, setMonth]   = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`)
  const { data: bills = [], isLoading: loading } = useQuery({
    queryKey: ['tenant', 'bills', month],
    queryFn: () => request({ url: `/tenant/bills${month ? `?month=${month}` : ''}` }),
  })

  return (
    <div className="py-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">আমার বিল</h1>

      <input
        type="month"
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
        value={month}
        onChange={e => setMonth(e.target.value)}
      />

      {loading ? (
        <div className="space-y-3">
          {[1,2].map(i => <div key={i} className="h-36 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : bills.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>{month} মাসে কোনো বিল নেই</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bills.map(b => <BillCard key={b._id} bill={b} role="tenant" queryKey={['tenant', 'bills', month]} />)}
        </div>
      )}
    </div>
  )
}
