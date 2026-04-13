'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { BillCard } from '@/components/landlord/BillCard'

export default function BillsPage() {
  const router = useRouter()
  const now   = new Date()
  const cur   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [month, setMonth]   = useState(cur)
  const [bills, setBills]   = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGen]  = useState(false)

  const load = async (m) => {
    setLoading(true)
    try {
      const res = await api.get(`/landlord/bills?month=${m}`)
      setBills(res.data.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load(month) }, [month])

  const bulkGenerate = async () => {
    setGen(true)
    try {
      const [y, m] = month.split('-')
      const res = await api.post('/landlord/bills/bulk-generate', { month, year: Number(y) })
      toast.success(res.data.message)
      load(month)
    } catch (err) {
      toast.error(err.response?.data?.message || 'সমস্যা হয়েছে')
    } finally { setGen(false) }
  }

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

      {/* Month picker */}
      <input
        type="month"
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
        value={month}
        onChange={e => setMonth(e.target.value)}
      />

      {/* Bulk generate */}
      <button
        onClick={bulkGenerate}
        disabled={generating}
        className="w-full flex items-center justify-center gap-2 border-2 border-green-600 text-green-600 py-3 rounded-xl font-medium disabled:opacity-50"
      >
        <Zap size={18} />
        {generating ? 'তৈরি হচ্ছে...' : 'সকলের বিল একসাথে তৈরি করুন'}
      </button>

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
          {bills.map(b => <BillCard key={b._id} bill={b} role="landlord" onRefresh={() => load(month)} />)}
        </div>
      )}
    </div>
  )
}
