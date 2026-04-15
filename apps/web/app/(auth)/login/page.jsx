'use client'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import api from '@/lib/api'
import { storeAuth } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm]       = useState({ email: '', password: '' })
  const [showPass, setShow]   = useState(false)
  const loginMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/auth/login', payload)
      return res.data
    },
    onSuccess: (data) => {
      storeAuth({ token: data.token, user: data.user })
      toast.success('লগইন সফল!')
      router.push(data.redirect)
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.message || 'লগইন ব্যর্থ হয়েছে')
    },
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password)
      return toast.error('ইমেইল ও পাসওয়ার্ড দিন')

    loginMutation.mutate(form)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-3xl font-bold">বা</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">BariManager</h1>
          <p className="text-gray-500 mt-1">বাড়ি ভাড়া ব্যবস্থাপনা সিস্টেম</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">লগইন করুন</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ইমেইল</label>
              <input
                type="email"
                placeholder="আপনার ইমেইল লিখুন"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">পাসওয়ার্ড</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="পাসওয়ার্ড লিখুন"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShow(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-1"
                >
                  {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold py-3 rounded-xl text-base transition-colors flex items-center justify-center gap-2"
            >
              {loginMutation.isPending ? (
                <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogIn size={20} />
              )}
              {loginMutation.isPending ? 'অপেক্ষা করুন...' : 'লগইন'}
            </button>
          </form>
        </div>

        {/* Subscribe link */}
        <p className="text-center text-sm text-gray-500 mt-6">
          নতুন ল্যান্ডলর্ড?{' '}
          <a href="/subscribe" className="text-green-600 font-medium underline">
            সাবস্ক্রাইব করুন
          </a>
        </p>
      </div>
    </div>
  )
}
