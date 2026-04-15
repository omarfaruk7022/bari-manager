'use client'

import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { request } from '@/lib/query'

export default function TenantDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const tenantId = params.id
  const { data: tenant, isLoading } = useQuery({
    queryKey: ['landlord', 'tenant', tenantId],
    queryFn: () => request({ url: `/landlord/tenants/${tenantId}` }),
    enabled: !!tenantId,
  })
  const updateMutation = useMutation({
    mutationFn: async (payload) => api.put(`/landlord/tenants/${tenantId}`, payload),
    onSuccess: async () => {
      toast.success('তথ্য আপডেট হয়েছে')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['landlord', 'tenant', tenantId] }),
        queryClient.invalidateQueries({ queryKey: ['landlord', 'tenants'] }),
      ])
    },
    onError: (err) => toast.error(err.response?.data?.message || 'আপডেট করা যায়নি'),
  })
  const removeMutation = useMutation({
    mutationFn: async () => api.delete(`/landlord/tenants/${tenantId}`),
    onSuccess: async () => {
      toast.success('ভাড়াটে নিষ্ক্রিয় করা হয়েছে')
      await queryClient.invalidateQueries({ queryKey: ['landlord', 'tenants'] })
      router.push('/landlord/tenants')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'সরানো যায়নি'),
  })

  const defaults = useMemo(() => ({
    name: tenant?.name || '',
    phone: tenant?.phone || '',
    email: tenant?.email || '',
    nidNumber: tenant?.nidNumber || '',
    monthlyRent: tenant?.monthlyRent || '',
    advanceAmount: tenant?.advanceAmount || '',
    moveInDate: tenant?.moveInDate ? new Date(tenant.moveInDate).toISOString().slice(0, 10) : '',
    notes: tenant?.notes || '',
    emergencyName: tenant?.emergencyContact?.name || '',
    emergencyPhone: tenant?.emergencyContact?.phone || '',
  }), [tenant])

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />
  }

  if (!tenant) {
    return <div className="rounded-2xl bg-white p-6 text-center text-gray-500">ভাড়াটে পাওয়া যায়নি</div>
  }

  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="rounded-xl bg-gray-100 p-2">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{tenant.name}</h1>
          <p className="text-sm text-gray-500">ইউনিট {tenant.propertyId?.unitNumber || '—'} • {tenant.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}</p>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            updateMutation.mutate({
              name: formData.get('name'),
              phone: formData.get('phone'),
              email: formData.get('email'),
              nidNumber: formData.get('nidNumber'),
              monthlyRent: Number(formData.get('monthlyRent') || 0),
              advanceAmount: Number(formData.get('advanceAmount') || 0),
              moveInDate: formData.get('moveInDate'),
              notes: formData.get('notes'),
              emergencyContact: {
                name: formData.get('emergencyName'),
                phone: formData.get('emergencyPhone'),
              },
            })
          }}
          className="space-y-4 rounded-2xl bg-white p-4 shadow-sm"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <input name="name" defaultValue={defaults.name} placeholder="নাম" className="rounded-lg border border-gray-200 px-4 py-3" />
            <input name="phone" defaultValue={defaults.phone} placeholder="ফোন" className="rounded-lg border border-gray-200 px-4 py-3" />
            <input name="email" defaultValue={defaults.email} placeholder="ইমেইল" className="rounded-lg border border-gray-200 px-4 py-3" />
            <input name="nidNumber" defaultValue={defaults.nidNumber} placeholder="NID" className="rounded-lg border border-gray-200 px-4 py-3" />
            <input name="monthlyRent" type="number" defaultValue={defaults.monthlyRent} placeholder="মাসিক ভাড়া" className="rounded-lg border border-gray-200 px-4 py-3" />
            <input name="advanceAmount" type="number" defaultValue={defaults.advanceAmount} placeholder="অগ্রিম" className="rounded-lg border border-gray-200 px-4 py-3" />
            <input name="moveInDate" type="date" defaultValue={defaults.moveInDate} className="rounded-lg border border-gray-200 px-4 py-3" />
            <input name="emergencyName" defaultValue={defaults.emergencyName} placeholder="জরুরি যোগাযোগের নাম" className="rounded-lg border border-gray-200 px-4 py-3" />
            <input name="emergencyPhone" defaultValue={defaults.emergencyPhone} placeholder="জরুরি ফোন" className="rounded-lg border border-gray-200 px-4 py-3 md:col-span-2" />
          </div>
          <textarea name="notes" defaultValue={defaults.notes} rows={5} placeholder="নোট" className="w-full rounded-lg border border-gray-200 px-4 py-3" />
          <button type="submit" disabled={updateMutation.isPending} className="rounded-lg bg-green-600 px-4 py-3 font-medium text-white">
            {updateMutation.isPending ? 'সংরক্ষণ হচ্ছে...' : 'তথ্য সংরক্ষণ করুন'}
          </button>
        </form>

        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-gray-900">অ্যাকাউন্ট তথ্য</h2>
            <div className="mt-3 space-y-2 text-sm text-gray-600">
              <p>ইমেইল: {tenant.userId?.email || tenant.email || 'নেই'}</p>
              <p>সর্বশেষ লগইন: {tenant.userId?.lastLoginAt ? new Date(tenant.userId.lastLoginAt).toLocaleDateString('bn-BD') : 'নেই'}</p>
              <p>বাসার ইউনিট: {tenant.propertyId?.unitNumber || '—'}</p>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-gray-900">অ্যাকশন</h2>
            <button
              onClick={() => {
                if (!confirm('এই ভাড়াটেকে নিষ্ক্রিয় করবেন?')) return
                removeMutation.mutate()
              }}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-3 text-red-600"
            >
              <Trash2 size={16} /> ভাড়াটে সরান
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
