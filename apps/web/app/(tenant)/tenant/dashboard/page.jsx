'use client'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileText, CheckCircle, Clock, Bell, CalendarDays, Phone, Mail, UserRound } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { StatCard } from '@/components/shared/StatCard'
import { BillCard } from '@/components/landlord/BillCard'
import { request } from '@/lib/query'

export default function TenantDashboard() {
  const { user } = useAuth()

  const now   = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
  const { data: bills = [], isLoading: loading } = useQuery({
    queryKey: ['tenant', 'bills', month],
    queryFn: () => request({ url: `/tenant/bills?month=${month}` }),
  })

  const currentBill = bills[0]
  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('bn-BD', {
        month: 'long',
        year: 'numeric',
      }).format(new Date(`${month}-01`)),
    [month],
  )
  const { totalDue, paidCount } = useMemo(() => ({
    totalDue: bills.reduce((s, b) => s + b.dueAmount, 0),
    paidCount: bills.filter((b) => b.status === 'paid').length,
  }), [bills])

  return (
    <div className="py-4 space-y-5">
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-sky-950 via-teal-800 to-emerald-600 px-5 py-6 text-white shadow-[0_24px_80px_-28px_rgba(13,148,136,0.7)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%),radial-gradient(circle_at_left_center,rgba(167,243,208,0.16),transparent_24%),linear-gradient(135deg,transparent_20%,rgba(255,255,255,0.06)_100%)]" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium tracking-[0.18em] text-emerald-50/90 uppercase backdrop-blur">
            <CalendarDays className="h-3.5 w-3.5" />
            {monthLabel} আপডেট
          </div>

          <h1 className="mt-4 text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl">
            আসসালামু আলাইকুম{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50/85">
            আপনার বিল, বকেয়া আর এই মাসের পেমেন্ট অবস্থা এখানে এক নজরে দেখা যাবে।
          </p>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-black/10 px-3 py-2 text-sm text-emerald-50/90 backdrop-blur">
              <UserRound className="h-4 w-4 text-lime-200" />
              <span>{user?.name || 'নাম নেই'}</span>
            </div>
            {user?.phone && (
              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-black/10 px-3 py-2 text-sm text-emerald-50/90 backdrop-blur">
                <Phone className="h-4 w-4 text-emerald-100" />
                <span>{user.phone}</span>
              </div>
            )}
            {user?.email && (
              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-black/10 px-3 py-2 text-sm text-emerald-50/90 backdrop-blur">
                <Mail className="h-4 w-4 text-cyan-100" />
                <span>{user.email}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="এই মাসের বিল"  value={loading ? '...' : currentBill ? `৳${currentBill.totalAmount}` : 'নেই'} icon={FileText}    color="blue"  />
        <StatCard label="বকেয়া"         value={loading ? '...' : `৳${totalDue}`}                                      icon={Clock}       color="red"   />
        <StatCard label="পরিশোধিত বিল"  value={loading ? '...' : `${paidCount}টি`}                                     icon={CheckCircle} color="green" />
        <StatCard label="মোট বিল"       value={loading ? '...' : `${bills.length}টি`}                                  icon={Bell}        color="gray"  />
      </div>

      {/* Current month bill highlight */}
      {!loading && currentBill && (
        <div>
          <h2 className="font-semibold text-gray-700 mb-3">এই মাসের বিল</h2>
          <BillCard bill={currentBill} role="tenant" queryKey={['tenant', 'bills', month]} />
        </div>
      )}

      {!loading && !currentBill && (
        <div className="bg-green-50 rounded-2xl p-6 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="font-medium text-green-700">এই মাসে কোনো বিল নেই</p>
        </div>
      )}
    </div>
  )
}
