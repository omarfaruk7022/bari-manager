'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { CheckCircle, ArrowLeft } from 'lucide-react'
import api from '@/lib/api'

export default function SubscribePage() {
  const router = useRouter()
  const [form, setForm] = useState({
    applicantName: '', email: '', phone: '',
    propertyName: '', propertyAddress: '', totalUnits: 1,
  })
  const [loading, setLoading]   = useState(false)
  const [success, setSuccess]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.applicantName || !form.email || !form.phone)
      return toast.error('নাম, ইমেইল ও ফোন নম্বর দিন')

    setLoading(true)
    try {
      await api.post('/public/subscribe', form)
      setSuccess(true)
    } catch (err) {
      toast.error(err.response?.data?.message || 'আবেদন ব্যর্থ হয়েছে')
    } finally {
      setLoading(false)
    }
  }

  if (success) return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">আবেদন সফল!</h2>
        <p className="text-gray-500 mb-6">অ্যাডমিন শীঘ্রই আপনার আবেদন পর্যালোচনা করবেন। অনুমোদিত হলে ইমেইলে লগইন তথ্য পাঠানো হবে।</p>
        <button onClick={() => router.push('/login')} className="w-full bg-green-600 text-white py-3 rounded-xl font-medium">
          লগইন পেজে যান
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-sm mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 mb-6 mt-4">
          <ArrowLeft size={20} /> ফিরে যান
        </button>

        <div className="bg-white rounded-2xl shadow p-6">
          <h1 className="text-xl font-bold text-gray-900 mb-1">সাবস্ক্রিপশন আবেদন</h1>
          <p className="text-gray-500 text-sm mb-6">ফর্মটি পূরণ করুন। অ্যাডমিন অনুমোদন করলে ইমেইলে লগইন তথ্য পাবেন।</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: 'আপনার নাম *', key: 'applicantName', type: 'text', ph: 'পূর্ণ নাম লিখুন' },
              { label: 'ইমেইল *', key: 'email', type: 'email', ph: 'আপনার ইমেইল' },
              { label: 'ফোন নম্বর *', key: 'phone', type: 'tel', ph: '01XXXXXXXXX' },
              { label: 'বাড়ির নাম', key: 'propertyName', type: 'text', ph: 'যেমন: রহমান ভিলা' },
              { label: 'ঠিকানা', key: 'propertyAddress', type: 'text', ph: 'বাড়ির ঠিকানা' },
            ].map(({ label, key, type, ph }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                <input
                  type={type}
                  placeholder={ph}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">মোট ফ্ল্যাট/রুম সংখ্যা</label>
              <input
                type="number"
                min="1"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                value={form.totalUnits}
                onChange={(e) => setForm({ ...form, totalUnits: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold py-3 rounded-xl text-base transition-colors"
            >
              {loading ? 'জমা হচ্ছে...' : 'আবেদন জমা দিন'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
