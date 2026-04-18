'use client'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Bell, CheckCheck, Inbox, Send } from 'lucide-react'
import api from '@/lib/api'
import { request } from '@/lib/query'

const getId = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value._id || ''
}

const getInboxSenderLabel = (item) => {
  if (item.senderRole === 'admin') return 'BariManager'
  if (item.senderRole === 'landlord') return item.landlordId?.name || 'বাড়িওয়ালা'
  if (item.type === 'notice' && getId(item.userId) === getId(item.landlordId)) return 'BariManager'
  return item.landlordId?.name || 'BariManager'
}

export default function NoticesPage() {
  const queryClient = useQueryClient()
  const [tab, setTab]         = useState('inbox')
  const [form, setForm]       = useState({ title: '', body: '', tenantId: '', channel: 'in_app' })
  const { data: tenants = [] } = useQuery({
    queryKey: ['landlord', 'tenants', 'notice-form'],
    queryFn: () => request({ url: '/landlord/tenants?active=true&limit=100' }),
  })
  const { data: inbox = [], isLoading: inboxLoading } = useQuery({
    queryKey: ['landlord', 'notifications', 'inbox'],
    queryFn: () => request({ url: '/notifications' }),
  })
  const { data: sent = [], isLoading: sentLoading } = useQuery({
    queryKey: ['landlord', 'notifications', 'sent'],
    queryFn: () => request({ url: '/notifications?scope=sent' }),
  })
  const sendNoticeMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/landlord/notices', payload)
      return res.data
    },
    onSuccess: async (data) => {
      toast.success(data.message)
      setForm({ title: '', body: '', tenantId: '', channel: 'in_app' })
      setTab('sent')
      await queryClient.invalidateQueries({ queryKey: ['landlord', 'notifications'] })
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'পাঠানো যায়নি')
    },
  })
  const markReadMutation = useMutation({
    mutationFn: async () => {
      const res = await api.put('/notifications/mark-read')
      return res.data
    },
    onSuccess: async () => {
      toast.success('সব নোটিফিকেশন পড়া হয়েছে')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['landlord', 'notifications', 'inbox'] }),
        queryClient.invalidateQueries({ queryKey: ['auth', 'me'] }),
      ])
    },
    onError: (err) => toast.error(err.response?.data?.message || 'আপডেট করা যায়নি'),
  })

  const handleSend = (e) => {
    e.preventDefault()
    if (!form.title || !form.body) return toast.error('শিরোনাম ও বার্তা দিন')
    sendNoticeMutation.mutate(form)
  }

  return (
    <div className="py-4 space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Bell className="text-green-600" size={24} />
          <div>
            <h1 className="text-xl font-bold text-gray-900">নোটিফিকেশন</h1>
            <p className="text-sm text-gray-500">প্রাপ্ত নোটিফিকেশন, পাঠানো নোটিশ এবং নতুন নোটিশ</p>
          </div>
        </div>
        {tab === 'inbox' && inbox.some(n => !n.isRead) && (
          <button
            onClick={() => markReadMutation.mutate()}
            disabled={markReadMutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700 disabled:opacity-50"
          >
            <CheckCheck size={16} />
            সব পড়া হয়েছে
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-lg bg-gray-100 p-1">
        {[
          { key: 'inbox', label: 'প্রাপ্ত', count: inbox.length },
          { key: 'sent', label: 'পাঠানো', count: sent.length },
          { key: 'send', label: 'পাঠান' },
        ].map(item => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
              tab === item.key ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-500'
            }`}
          >
            {item.label}{item.count !== undefined ? ` (${item.count})` : ''}
          </button>
        ))}
      </div>

      {tab === 'inbox' && (
        <NotificationList
          loading={inboxLoading}
          items={inbox}
          empty="কোনো প্রাপ্ত নোটিফিকেশন নেই"
          mode="inbox"
        />
      )}

      {tab === 'sent' && (
        <NotificationList
          loading={sentLoading}
          items={sent}
          empty="কোনো পাঠানো নোটিশ নেই"
          mode="sent"
        />
      )}

      {tab === 'send' && (
      <div className="bg-white rounded-lg p-4 shadow-sm">
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
                { value: 'sms',    label: 'SMS' },
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
      )}

      {tab === 'send' && (
      <div className="bg-green-50 rounded-lg p-4">
        <p className="text-sm text-green-700">
          <strong>টিপস:</strong> সকল ভাড়াটেকে পাঠাতে "প্রাপক" ঘরটি খালি রাখুন।
        </p>
      </div>
      )}
    </div>
  )
}

function NotificationList({ loading, items, empty, mode }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(item => (
          <div key={item} className="h-24 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-white py-12 text-center">
        <Inbox className="mx-auto text-gray-300" size={28} />
        <p className="mt-3 text-sm font-medium text-gray-400">{empty}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map(item => (
        <div
          key={item._id}
          className={`rounded-lg border bg-white p-4 shadow-sm ${
            !item.isRead && mode === 'inbox' ? 'border-green-200' : 'border-gray-100'
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-bold text-gray-900">{item.title}</p>
              <p className="mt-1 text-sm leading-6 text-gray-600">{item.body}</p>
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-500">
              {item.channel === 'sms' ? 'SMS' : item.channel === 'email' ? 'ইমেইল' : 'অ্যাপ'}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
            <span>
              {mode === 'sent'
                ? `প্রাপক: ${item.userId?.name || 'ভাড়াটে'}`
                : `প্রেরক: ${getInboxSenderLabel(item)}`}
            </span>
            <span>{new Date(item.createdAt).toLocaleString('bn-BD')}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
