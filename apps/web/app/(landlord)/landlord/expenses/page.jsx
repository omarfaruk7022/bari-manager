'use client'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Trash2, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

const CATEGORIES = [
  { value: 'utilities',    label: 'ইউটিলিটি' },
  { value: 'salary',       label: 'বেতন' },
  { value: 'maintenance',  label: 'রক্ষণাবেক্ষণ' },
  { value: 'repair',       label: 'মেরামত' },
  { value: 'cleaning',     label: 'পরিষ্কার' },
  { value: 'security',     label: 'নিরাপত্তা' },
  { value: 'other',        label: 'অন্যান্য' },
]

export default function ExpensesPage() {
  const router = useRouter()
  const now    = new Date()
  const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [expenses, setExpenses] = useState([])
  const [month, setMonth]       = useState(curMonth)
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [form, setForm] = useState({ title: '', amount: '', category: 'other', month: curMonth, date: '' })

  const load = async (m) => {
    setLoading(true)
    try {
      const res = await api.get(`/landlord/expenses?month=${m}`)
      setExpenses(res.data.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load(month) }, [month])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.title || !form.amount) return toast.error('শিরোনাম ও পরিমাণ দিন')
    setSaving(true)
    try {
      await api.post('/landlord/expenses', { ...form, amount: Number(form.amount), month })
      toast.success('খরচ যুক্ত হয়েছে')
      setShowForm(false)
      setForm({ title: '', amount: '', category: 'other', month: curMonth, date: '' })
      load(month)
    } catch (err) {
      toast.error(err.response?.data?.message || 'সমস্যা হয়েছে')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('এই খরচ মুছবেন?')) return
    try {
      await api.delete(`/landlord/expenses/${id}`)
      toast.success('মুছে গেছে')
      load(month)
    } catch {
      toast.error('মুছতে পারেনি')
    }
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0)

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">খরচ</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl font-medium text-sm"
        >
          <Plus size={18} /> নতুন
        </button>
      </div>

      <input
        type="month"
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
        value={month}
        onChange={e => setMonth(e.target.value)}
      />

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3 border-2 border-green-200">
          <h2 className="font-semibold text-gray-700">নতুন খরচ যুক্ত করুন</h2>
          <form onSubmit={handleAdd} className="space-y-3">
            <input
              type="text"
              placeholder="খরচের শিরোনাম *"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            />
            <input
              type="number"
              placeholder="পরিমাণ (৳) *"
              min="0"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            />
            <select
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            >
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 border border-gray-200 py-3 rounded-xl font-medium text-gray-600">
                বাতিল
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 bg-green-600 text-white py-3 rounded-xl font-medium disabled:bg-green-300">
                {saving ? 'সংরক্ষণ...' : 'সংরক্ষণ করুন'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Total */}
      <div className="bg-green-50 rounded-2xl p-4 flex justify-between items-center">
        <span className="font-medium text-gray-700">{month} মাসে মোট খরচ</span>
        <span className="text-xl font-bold text-green-700">৳{total.toLocaleString()}</span>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>{month} মাসে কোনো খরচ নেই</p>
        </div>
      ) : (
        <div className="space-y-3">
          {expenses.map(exp => (
            <div key={exp._id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{exp.title}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {CATEGORIES.find(c => c.value === exp.category)?.label || exp.category}
                  {exp.date && ` • ${new Date(exp.date).toLocaleDateString('bn-BD')}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-gray-800">৳{exp.amount.toLocaleString()}</span>
                <button onClick={() => handleDelete(exp._id)} className="text-red-400 p-1">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
