'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Plus, Search } from 'lucide-react'
import { TenantCard } from '@/components/landlord/TenantCard'
import { request } from '@/lib/query'

export default function TenantsPage() {
  const router = useRouter()
  const [search, setSearch]     = useState('')
  const { data: tenants = [], isLoading: loading } = useQuery({
    queryKey: ['landlord', 'tenants', search],
    queryFn: () => request({ url: `/landlord/tenants?active=true${search ? `&search=${search}` : ''}` }),
  })

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">ভাড়াটে</h1>
        <button
          onClick={() => router.push('/landlord/tenants/new')}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl font-medium text-sm"
        >
          <Plus size={18} /> নতুন
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="নাম দিয়ে খুঁজুন..."
          className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : tenants.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">কোনো ভাড়াটে নেই</p>
          <p className="text-sm mt-1">নতুন ভাড়াটে যুক্ত করুন</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tenants.map((t) => (
            <TenantCard
              key={t._id}
              tenant={t}
              onView={() => router.push(`/landlord/tenants/${t._id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
