'use client'
import { useEffect, useState } from 'react'
import { Users, FileText, TrendingUp, AlertCircle } from 'lucide-react'
import api from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { StatCard } from '@/components/shared/StatCard'
import { RecentBills } from '@/components/landlord/RecentBills'

export default function LandlordDashboard() {
  const { user } = useAuth()
  const [stats, setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  const now   = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  useEffect(() => {
    const load = async () => {
      try {
        const [tenantsRes, reportRes] = await Promise.all([
          api.get('/landlord/tenants?active=true&limit=1'),
          api.get(`/landlord/reports/monthly?month=${month}`),
        ])
        setStats({
          tenants:   tenantsRes.data.total,
          report:    reportRes.data.data,
        })
      } catch (e) { /* ignore */ }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const r = stats?.report

  return (
    <div className="py-4 space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          আসসালামু আলাইকুম{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
        </h1>
        <p className="text-gray-500 mt-1">{month} মাসের সারসংক্ষেপ</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="সক্রিয় ভাড়াটে"    value={loading ? '...' : stats?.tenants ?? 0}     icon={Users}       color="green" />
        <StatCard label="মোট বিল"            value={loading ? '...' : `৳${r?.totalBilled ?? 0}`}  icon={FileText}    color="blue"  />
        <StatCard label="আদায় হয়েছে"         value={loading ? '...' : `৳${r?.totalCollected ?? 0}`} icon={TrendingUp}  color="green" />
        <StatCard label="বকেয়া"             value={loading ? '...' : `৳${r?.totalDue ?? 0}`}    icon={AlertCircle} color="red"   />
      </div>

      {/* Bill status pills */}
      {r && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-3">বিলের অবস্থা</h2>
          <div className="flex gap-3">
            <div className="flex-1 bg-green-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{r.statusBreakdown?.paid ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">পরিশোধিত</p>
            </div>
            <div className="flex-1 bg-yellow-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-yellow-600">{r.statusBreakdown?.partial ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">আংশিক</p>
            </div>
            <div className="flex-1 bg-red-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{r.statusBreakdown?.unpaid ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">অপরিশোধিত</p>
            </div>
          </div>
        </div>
      )}

      <RecentBills />
    </div>
  )
}
