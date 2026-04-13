'use client'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { ToggleLeft, ToggleRight } from 'lucide-react'
import api from '@/lib/api'

export default function AdminLandlordsPage() {
  const [landlords, setLandlords] = useState([])
  const [loading, setLoading]     = useState(true)
  const [toggling, setToggling]   = useState(null)

  const load = async () => {
    try {
      const res = await api.get('/admin/landlords')
      setLandlords(res.data.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const toggle = async (id) => {
    setToggling(id)
    try {
      const res = await api.put(`/admin/landlords/${id}/toggle`)
      toast.success(res.data.message)
      load()
    } catch {
      toast.error('পরিবর্তন করা যায়নি')
    } finally { setToggling(null) }
  }

  return (
    <div className="py-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">সকল ল্যান্ডলর্ড</h1>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : landlords.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><p>কোনো ল্যান্ডলর্ড নেই</p></div>
      ) : (
        <div className="space-y-3">
          {landlords.map(l => (
            <div key={l._id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-gray-900">{l.name}</p>
                  <p className="text-sm text-gray-500">{l.email}</p>
                  {l.phone && <p className="text-sm text-gray-500">{l.phone}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    যোগদান: {new Date(l.createdAt).toLocaleDateString('bn-BD')}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${l.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {l.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                  </span>
                  <button
                    onClick={() => toggle(l._id)}
                    disabled={toggling === l._id}
                    className="text-gray-400 disabled:opacity-50"
                  >
                    {l.isActive ? <ToggleRight size={28} className="text-green-600" /> : <ToggleLeft size={28} />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
