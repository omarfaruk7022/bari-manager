'use client'
import { useEffect, useState } from 'react'
import { FileText, CheckCircle, Clock, Bell } from 'lucide-react'
import api from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { StatCard } from '@/components/shared/StatCard'
import { BillCard } from '@/components/landlord/BillCard'

export default function TenantDashboard() {
  const { user } = useAuth()
  const [bills, setBills]   = useState([])
  const [loading, setLoading] = useState(true)

  const now   = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`

  useEffect(() => {
    api.get(`/tenant/bills?month=${month}`)
      .then(r => setBills(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const currentBill = bills[0]
  const totalDue    = bills.reduce((s, b) => s + b.dueAmount, 0)
  const paidCount   = bills.filter(b => b.status === 'paid').length

  return (
    <div className="py-4 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          আসসালামু আলাইকুম{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
        </h1>
        <p className="text-gray-500 mt-1">{month} মাসের অবস্থা</p>
      </div>

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
          <BillCard bill={currentBill} role="tenant" onRefresh={() => {}} />
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
