'use client'
import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import { request } from '@/lib/query'

const BILL_TYPES = [
  { value: 'rent',         label: 'ভাড়া' },
  { value: 'electricity',  label: 'বিদ্যুৎ' },
  { value: 'gas',          label: 'গ্যাস' },
  { value: 'water',        label: 'পানি' },
  { value: 'garbage',      label: 'ময়লা' },
  { value: 'internet',     label: 'ইন্টারনেট' },
  { value: 'maintenance',  label: 'রক্ষণাবেক্ষণ' },
  { value: 'custom',       label: 'অন্যান্য' },
]

export default function NewBillPage() {
  const router = useRouter()
  const now = new Date()
  const [form, setForm] = useState({
    tenantId: '', propertyId: '',
    month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    year: now.getFullYear(),
    items: [{ type: 'rent', label: '', amount: '' }],
    dueDate: '',
  })

  const { data: tenants = [] } = useQuery({
    queryKey: ['landlord', 'tenants', 'bill-form'],
    queryFn: () => request({ url: '/landlord/tenants?active=true&limit=100' }),
  })
  const createBillMutation = useMutation({
    mutationFn: async (payload) => api.post('/landlord/bills', payload),
    onSuccess: () => {
      toast.success('বিল তৈরি হয়েছে!')
      router.push('/landlord/bills')
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'সমস্যা হয়েছে')
    },
  })

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { type: 'rent', label: '', amount: '' }] }))
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))
  const setItem = (i, k, v) => setForm(f => {
    const items = [...f.items]
    items[i] = { ...items[i], [k]: v }
    return { ...f, items }
  })

  const total = form.items.reduce((s, i) => s + (Number(i.amount) || 0), 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.tenantId) return toast.error('ভাড়াটে বেছে নিন')
    if (form.items.some(i => !i.amount || i.amount <= 0)) return toast.error('সব বিলের পরিমাণ দিন')
    const items = form.items.map(i => ({ ...i, amount: Number(i.amount) }))
    createBillMutation.mutate({ ...form, items, year: Number(form.year) })
  }

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl bg-gray-100"><ArrowLeft size={20} /></button>
        <h1 className="text-xl font-bold text-gray-900">নতুন বিল</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ভাড়াটে *</label>
            <select
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              value={form.tenantId}
              onChange={e => {
                const t = tenants.find(x => x._id === e.target.value)
                setForm(f => ({ ...f, tenantId: e.target.value, propertyId: t?.propertyId?._id || t?.propertyId || '' }))
              }}
              required
            >
              <option value="">ভাড়াটে বেছে নিন</option>
              {tenants.map(t => (
                <option key={t._id} value={t._id}>{t.name} — {t.propertyId?.unitNumber}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">মাস *</label>
              <input type="month" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value, year: Number(e.target.value.split('-')[0]) }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">শেষ তারিখ</label>
              <input type="date" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
            </div>
          </div>
        </div>

        {/* Bill items */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <h2 className="font-semibold text-gray-700">বিলের আইটেম</h2>
          {form.items.map((item, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex-1 space-y-2">
                <select
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  value={item.type}
                  onChange={e => setItem(i, 'type', e.target.value)}
                >
                  {BILL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                {item.type === 'custom' && (
                  <input type="text" placeholder="বিবরণ লিখুন"
                    className="w-full border border-gray-200 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={item.label} onChange={e => setItem(i, 'label', e.target.value)} />
                )}
                <input type="number" placeholder="পরিমাণ (৳)" min="0"
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                  value={item.amount} onChange={e => setItem(i, 'amount', e.target.value)} />
              </div>
              {form.items.length > 1 && (
                <button type="button" onClick={() => removeItem(i)} className="p-3 text-red-400 mt-1">
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          ))}

          <button type="button" onClick={addItem}
            className="w-full flex items-center justify-center gap-2 border border-dashed border-green-400 text-green-600 py-3 rounded-xl">
            <Plus size={18} /> আইটেম যুক্ত করুন
          </button>
        </div>

        {/* Total */}
        <div className="bg-green-50 rounded-2xl p-4 flex justify-between items-center">
          <span className="font-semibold text-gray-700">মোট বিল</span>
          <span className="text-2xl font-bold text-green-600">৳{total.toLocaleString()}</span>
        </div>

        <button type="submit" disabled={createBillMutation.isPending}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold py-4 rounded-xl text-base">
          {createBillMutation.isPending ? 'সংরক্ষণ হচ্ছে...' : 'বিল তৈরি করুন'}
        </button>
      </form>
    </div>
  )
}
