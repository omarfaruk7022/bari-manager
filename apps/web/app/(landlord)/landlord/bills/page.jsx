'use client'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Plus, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { BillCard } from '@/components/landlord/BillCard'
import { request } from '@/lib/query'

export default function BillsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const now   = new Date()
  const cur   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [month, setMonth]   = useState(cur)
  const [propertyName, setPropertyName] = useState('')
  const { data: bills = [], isLoading: loading } = useQuery({
    queryKey: ['landlord', 'bills', month, propertyName],
    queryFn: () => request({ url: `/landlord/bills?month=${month}${propertyName ? `&propertyName=${encodeURIComponent(propertyName)}` : ''}` }),
  })
  const { data: properties = [] } = useQuery({
    queryKey: ['landlord', 'properties', 'all'],
    queryFn: () => request({ url: '/landlord/properties' }),
  })

  const propertyOptions = useMemo(() => {
    const names = new Set()
    properties.forEach((property) => {
      if (property.propertyName) names.add(property.propertyName)
    })
    return Array.from(names).sort((a, b) => a.localeCompare(b))
  }, [properties])

  const bulkGenerateMutation = useMutation({
    mutationFn: async ({ propertyName: selectedPropertyName = '' } = {}) => {
      const [year] = month.split('-')
      const res = await api.post('/landlord/bills/bulk-generate', {
        month,
        year: Number(year),
        ...(selectedPropertyName ? { propertyName: selectedPropertyName } : {}),
      })
      return res.data
    },
    onSuccess: async (data) => {
      toast.success(data.message)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['landlord', 'bills', month] }),
        queryClient.invalidateQueries({ queryKey: ['landlord', 'bills', month, propertyName] }),
        queryClient.invalidateQueries({ queryKey: ['landlord', 'recent-bills'] }),
        queryClient.invalidateQueries({ queryKey: ['landlord', 'dashboard'] }),
      ])
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'সমস্যা হয়েছে')
    },
  })

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">বিলসমূহ</h1>
        <button
          onClick={() => router.push('/landlord/bills/new')}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl font-medium text-sm"
        >
          <Plus size={18} /> নতুন
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <input
          type="month"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
          value={month}
          onChange={e => setMonth(e.target.value)}
        />
        <select
          value={propertyName}
          onChange={(e) => setPropertyName(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">সব প্রপার্টি</option>
          {propertyOptions.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <button
          onClick={() => bulkGenerateMutation.mutate({ propertyName: '' })}
          disabled={bulkGenerateMutation.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-green-600 py-3 font-medium text-green-600 disabled:opacity-50"
        >
          <Zap size={18} />
          {bulkGenerateMutation.isPending ? 'তৈরি হচ্ছে...' : 'সব প্রপার্টির বিল তৈরি করুন'}
        </button>
        <button
          onClick={() => bulkGenerateMutation.mutate({ propertyName })}
          disabled={bulkGenerateMutation.isPending || !propertyName}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3 font-medium text-white disabled:bg-green-300"
        >
          <Zap size={18} />
          {bulkGenerateMutation.isPending ? 'তৈরি হচ্ছে...' : 'নির্বাচিত প্রপার্টির বিল তৈরি করুন'}
        </button>
      </div>

      {/* Bills */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : bills.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">{month} মাসে কোনো বিল নেই</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bills.map(b => <BillCard key={b._id} bill={b} role="landlord" queryKey={['landlord', 'bills', month]} />)}
        </div>
      )}
    </div>
  )
}
