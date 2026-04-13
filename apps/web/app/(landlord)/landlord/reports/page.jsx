'use client'
import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import api from '@/lib/api'

const MONTH_LABELS = ['জানু','ফেব্রু','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টে','অক্টো','নভে','ডিসে']

export default function ReportsPage() {
  const now  = new Date()
  const [year, setYear]       = useState(now.getFullYear())
  const [month, setMonth]     = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`)
  const [yearly, setYearly]   = useState(null)
  const [monthly, setMonthly] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [yr, mr] = await Promise.all([
          api.get(`/landlord/reports/yearly?year=${year}`),
          api.get(`/landlord/reports/monthly?month=${month}`),
        ])
        setYearly(yr.data.data)
        setMonthly(mr.data.data)
      } finally { setLoading(false) }
    }
    load()
  }, [year, month])

  const chartData = yearly?.monthlyBreakdown?.map((m, i) => ({
    name: MONTH_LABELS[i],
    আদায়: m.collected,
    খরচ:  m.expenses,
    লাভ:  m.profit,
  })) || []

  return (
    <div className="py-4 space-y-5">
      <h1 className="text-xl font-bold text-gray-900">রিপোর্ট</h1>

      {/* Year selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-600 whitespace-nowrap">বার্ষিক:</label>
        <select
          className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
          value={year}
          onChange={e => setYear(Number(e.target.value))}
        >
          {[now.getFullYear(), now.getFullYear()-1, now.getFullYear()-2].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Yearly summary cards */}
      {yearly && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-50 rounded-2xl p-3 text-center">
            <p className="text-xs text-gray-500">মোট আদায়</p>
            <p className="font-bold text-green-700 mt-1 text-sm">৳{(yearly.totalCollected/1000).toFixed(1)}K</p>
          </div>
          <div className="bg-red-50 rounded-2xl p-3 text-center">
            <p className="text-xs text-gray-500">মোট খরচ</p>
            <p className="font-bold text-red-600 mt-1 text-sm">৳{(yearly.totalExpenses/1000).toFixed(1)}K</p>
          </div>
          <div className="bg-blue-50 rounded-2xl p-3 text-center">
            <p className="text-xs text-gray-500">মোট লাভ</p>
            <p className="font-bold text-blue-700 mt-1 text-sm">৳{(yearly.totalProfit/1000).toFixed(1)}K</p>
          </div>
        </div>
      )}

      {/* Bar chart */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="font-semibold text-gray-700 mb-4">{year} সালের মাসিক চিত্র</h2>
        {loading ? (
          <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `৳${v.toLocaleString()}`} />
              <Bar dataKey="আদায়" fill="#16a34a" radius={[4,4,0,0]} />
              <Bar dataKey="খরচ"  fill="#ef4444" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Monthly detail */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <label className="text-sm font-medium text-gray-600 whitespace-nowrap">মাসিক:</label>
          <input
            type="month"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
            value={month}
            onChange={e => setMonth(e.target.value)}
          />
        </div>

        {monthly && (
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <h2 className="font-semibold text-gray-700">{month} মাসের বিবরণ</h2>
            {[
              { label: 'সক্রিয় ভাড়াটে',  value: monthly.activeTenants,                    unit: 'জন' },
              { label: 'মোট বিল',           value: `৳${monthly.totalBilled?.toLocaleString()}`, unit: '' },
              { label: 'আদায়',              value: `৳${monthly.totalCollected?.toLocaleString()}`, unit: '' },
              { label: 'বকেয়া',             value: `৳${monthly.totalDue?.toLocaleString()}`,  unit: '' },
              { label: 'মোট খরচ',           value: `৳${monthly.totalExpenses?.toLocaleString()}`, unit: '' },
              { label: 'নিট লাভ',           value: `৳${monthly.profit?.toLocaleString()}`,   unit: '' },
            ].map(row => (
              <div key={row.label} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-gray-600">{row.label}</span>
                <span className="font-semibold text-gray-900">{row.value}{row.unit}</span>
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <div className="flex-1 bg-green-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">পরিশোধিত</p>
                <p className="text-xl font-bold text-green-600">{monthly.statusBreakdown?.paid}</p>
              </div>
              <div className="flex-1 bg-yellow-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">আংশিক</p>
                <p className="text-xl font-bold text-yellow-600">{monthly.statusBreakdown?.partial}</p>
              </div>
              <div className="flex-1 bg-red-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">অপরিশোধিত</p>
                <p className="text-xl font-bold text-red-600">{monthly.statusBreakdown?.unpaid}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
