'use client'
import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Bell, Send } from 'lucide-react'
import api from '@/lib/api'
import { request } from '@/lib/query'

export default function NoticesPage() {
  const [form, setForm]       = useState({ title: '', body: '', tenantId: '', channel: 'in_app' })
  const { data: tenants = [] } = useQuery({
    queryKey: ['landlord', 'tenants', 'notice-form'],
    queryFn: () => request({ url: '/landlord/tenants?active=true&limit=100' }),
  })
  const sendNoticeMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/landlord/notices', payload)
      return res.data
    },
    onSuccess: (data) => {
      toast.success(data.message)
      setForm({ title: '', body: '', tenantId: '', channel: 'in_app' })
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'পাঠানো যায়নি')
    },
  })

  const handleSend = (e) => {
    e.preventDefault()
    if (!form.title || !form.body) return toast.error('শিরোনাম ও বার্তা দিন')
    sendNoticeMutation.mutate(form)
  }

  return (
    <div className="py-4 space-y-5">
      <div className="flex items-center gap-3">
        <Bell className="text-green-600" size={24} />
        <h1 className="text-xl font-bold text-gray-900">নোটিশ পাঠান</h1>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">প্রাপক</label>
            <select
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              value={form.tenantId}
              onChange={e => setForm(f => ({ ...f, tenantId: e.target.value }))}
            >
              <option value="">সকল ভাড়াটে</option>
              {tenants.map(t => (
                <option key={t._id} value={t._id}>{t.name} — {t.propertyId?.unitNumber}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">পাঠানোর মাধ্যম</label>
            <div className="flex gap-3">
              {[
                { value: 'in_app', label: 'অ্যাপ নোটিফিকেশন' },
                { value: 'email',  label: 'ইমেইল' },
              ].map(opt => (
                <label key={opt.value} className="flex-1 flex items-center gap-2 border border-gray-200 rounded-xl p-3 cursor-pointer has-[:checked]:border-green-500 has-[:checked]:bg-green-50">
                  <input
                    type="radio"
                    name="channel"
                    value={opt.value}
                    checked={form.channel === opt.value}
                    onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}
                    className="accent-green-600"
                  />
                  <span className="text-sm font-medium text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">শিরোনাম *</label>
            <input
              type="text"
              placeholder="নোটিশের শিরোনাম"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">বার্তা *</label>
            <textarea
              rows={5}
              placeholder="আপনার বার্তা লিখুন..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
            />
          </div>

          <button
            type="submit"
            disabled={sendNoticeMutation.isPending}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 text-base"
          >
            <Send size={18} />
            {sendNoticeMutation.isPending ? 'পাঠানো হচ্ছে...' : 'নোটিশ পাঠান'}
          </button>
        </form>
      </div>

      <div className="bg-green-50 rounded-2xl p-4">
        <p className="text-sm text-green-700">
          💡 <strong>টিপস:</strong> সকল ভাড়াটেকে পাঠাতে "প্রাপক" ঘরটি খালি রাখুন।
        </p>
      </div>
    </div>
  )
}
