'use client'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Building2, Plus, Search } from 'lucide-react'
import { TenantCard } from '@/components/landlord/TenantCard'
import { request } from '@/lib/query'

export default function TenantsPage() {
  const router = useRouter()
  const [search, setSearch]     = useState('')
  const [selectedProperty, setSelectedProperty] = useState('')
  const { data: tenants = [], isLoading: loading } = useQuery({
    queryKey: ['landlord', 'tenants', search, selectedProperty],
    queryFn: () => request({ url: `/landlord/tenants?active=true&limit=200${search ? `&search=${search}` : ''}${selectedProperty ? `&propertyId=${selectedProperty}` : ''}` }),
  })
  const { data: properties = [] } = useQuery({
    queryKey: ['landlord', 'properties', 'all'],
    queryFn: () => request({ url: '/landlord/properties?unitsOnly=true' }),
  })

  const propertyOptions = useMemo(() => {
    const groups = new Map()
    properties.forEach((property) => {
      const key = property.propertyName || 'নামহীন প্রপার্টি'
      if (!groups.has(key)) {
        groups.set(key, {
          name: key,
          address: property.propertyAddress || '',
          unitIds: [],
          units: 0,
        })
      }
      const group = groups.get(key)
      group.unitIds.push(property._id)
      group.units += 1
    })
    return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [properties])

  const groupedTenants = useMemo(() => {
    const groups = new Map()
    tenants.forEach((tenant) => {
      const property = tenant.propertyId
      const key = property?.propertyName || 'প্রপার্টি দেওয়া নেই'
      if (!groups.has(key)) {
        groups.set(key, {
          name: key,
          address: property?.propertyAddress || '',
          tenants: [],
          rentTotal: 0,
        })
      }
      const group = groups.get(key)
      group.tenants.push(tenant)
      group.rentTotal += Number(tenant.monthlyRent || 0)
    })
    return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [tenants])

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">ভাড়াটে</h1>
          <p className="text-sm text-gray-500">প্রপার্টি অনুযায়ী ভাড়াটে দেখুন</p>
        </div>
        <button
          onClick={() => router.push('/landlord/tenants/new')}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl font-medium text-sm"
        >
          <Plus size={18} /> নতুন
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_220px]">
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
        <select
          value={selectedProperty}
          onChange={(e) => setSelectedProperty(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">সব প্রপার্টি</option>
          {properties.map((property) => (
            <option key={property._id} value={property._id}>
              {property.propertyName} · {property.unitNumber}
            </option>
          ))}
        </select>
      </div>

      {propertyOptions.length > 0 && !selectedProperty && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {propertyOptions.map((property) => (
            <div
              key={property.name}
              className="flex min-w-[170px] items-center gap-2 rounded-xl bg-white px-3 py-2 text-left text-sm shadow-sm"
            >
              <Building2 size={17} className="text-green-600" />
              <span className="min-w-0">
                <span className="block truncate font-medium text-gray-800">{property.name}</span>
                <span className="block text-xs text-gray-500">{property.units} ইউনিট</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : tenants.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">কোনো ভাড়াটে নেই</p>
          <p className="text-sm mt-1">প্রপার্টি বেছে নিয়ে নতুন ভাড়াটে যুক্ত করুন</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groupedTenants.map((group) => (
            <section key={group.name} className="space-y-2">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-gray-900">{group.name}</h2>
                  <p className="text-xs text-gray-500">
                    {group.address || 'ঠিকানা দেওয়া নেই'} · {group.tenants.length} জন
                  </p>
                </div>
                <p className="text-sm font-semibold text-gray-700">
                  ৳{group.rentTotal.toLocaleString('bn-BD')}
                </p>
              </div>
              <div className="space-y-3">
                {group.tenants.map((t) => (
                  <TenantCard
                    key={t._id}
                    tenant={t}
                    onView={() => router.push(`/landlord/tenants/${t._id}`)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
