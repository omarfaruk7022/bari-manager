'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { CreditCard, Banknote, ChevronDown, ChevronUp } from 'lucide-react'
import api from '@/lib/api'

const STATUS_CONFIG = {
  paid:    { label: 'পরিশোধিত', bg: 'bg-green-100',  text: 'text-green-700'  },
  partial: { label: 'আংশিক',   bg: 'bg-yellow-100', text: 'text-yellow-700' },
  unpaid:  { label: 'অপরিশোধিত', bg: 'bg-red-100',  text: 'text-red-700'   },
}

const ITEM_LABELS = {
  rent: 'ভাড়া', electricity: 'বিদ্যুৎ', gas: 'গ্যাস',
  water: 'পানি', garbage: 'ময়লা', internet: 'ইন্টারনেট',
  maintenance: 'রক্ষণাবেক্ষণ', custom: '',
}

export function BillCard({ bill, role, onRefresh }) {
  const [expanded, setExpanded]   = useState(false)
  const [paying, setPaying]       = useState(false)
  const [cashAmount, setCashAmt]  = useState('')
  const [showCash, setShowCash]   = useState(false)
  const cfg = STATUS_CONFIG[bill.status] || STATUS_CONFIG.unpaid
  const canPay = role === 'tenant' && bill.status !== 'paid'
  const canMarkCash = role === 'landlord' && bill.status !== 'paid'

  const handleBkash = async () => {
    const amount = bill.dueAmount
    setPaying(true)
    try {
      const res = await api.post('/tenant/payments/bkash/init', { billId: bill._id, amount })
      window.location.href = res.data.bkashURL
    } catch (err) {
      toast.error(err.response?.data?.message || 'bKash পেমেন্ট শুরু করা যায়নি')
      setPaying(false)
    }
  }

  const handleCash = async () => {
    const amt = Number(cashAmount)
    if (!amt || amt <= 0) return toast.error('পরিমাণ দিন')
    if (amt > bill.dueAmount) return toast.error(`বকেয়ার চেয়ে বেশি দেওয়া যাবে না (৳${bill.dueAmount})`)
    setPaying(true)
    try {
      await api.post('/landlord/payments/cash', { billId: bill._id, amount: amt })
      toast.success('নগদ পেমেন্ট রেকর্ড হয়েছে')
      setShowCash(false)
      setCashAmt('')
      onRefresh?.()
    } catch (err) {
      toast.error(err.response?.data?.message || 'সমস্যা হয়েছে')
    } finally { setPaying(false) }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-bold text-gray-900 text-base">{bill.month} মাসের বিল</p>
            {bill.tenantId?.name && (
              <p className="text-sm text-gray-500 mt-0.5">{bill.tenantId.name} • {bill.propertyId?.unitNumber}</p>
            )}
            {bill.dueDate && (
              <p className="text-xs text-gray-400 mt-1">
                শেষ তারিখ: {new Date(bill.dueDate).toLocaleDateString('bn-BD')}
              </p>
            )}
          </div>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
            {cfg.label}
          </span>
        </div>

        {/* Amount row */}
        <div className="flex items-end justify-between mt-3">
          <div>
            <p className="text-xs text-gray-400">মোট</p>
            <p className="text-2xl font-bold text-gray-900">৳{bill.totalAmount?.toLocaleString()}</p>
          </div>
          {bill.status !== 'unpaid' && (
            <div className="text-right">
              <p className="text-xs text-gray-400">পরিশোধিত</p>
              <p className="text-lg font-semibold text-green-600">৳{bill.paidAmount?.toLocaleString()}</p>
            </div>
          )}
          {bill.dueAmount > 0 && (
            <div className="text-right">
              <p className="text-xs text-gray-400">বকেয়া</p>
              <p className="text-lg font-semibold text-red-600">৳{bill.dueAmount?.toLocaleString()}</p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {bill.status !== 'unpaid' && (
          <div className="mt-3 bg-gray-100 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(100, (bill.paidAmount / bill.totalAmount) * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Expand items */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-500 border-t border-gray-50"
      >
        <span>বিস্তারিত দেখুন</span>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2 border-t border-gray-50">
          {bill.items?.map((item, i) => (
            <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
              <span className="text-gray-600">{ITEM_LABELS[item.type] || item.label || item.type}</span>
              <span className="font-medium text-gray-800">৳{item.amount?.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tenant pay buttons */}
      {canPay && !showCash && (
        <div className="px-4 pb-4 pt-2 flex gap-2 border-t border-gray-50">
          <button
            onClick={handleBkash}
            disabled={paying}
            className="flex-1 bg-pink-600 hover:bg-pink-700 disabled:bg-pink-300 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
          >
            <CreditCard size={16} />
            {paying ? 'অপেক্ষা...' : 'bKash দিয়ে পে করুন'}
          </button>
        </div>
      )}

      {/* Landlord cash mark */}
      {canMarkCash && !showCash && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-50">
          <button
            onClick={() => setShowCash(true)}
            className="w-full border border-green-500 text-green-600 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Banknote size={16} /> নগদ পেমেন্ট রেকর্ড করুন
          </button>
        </div>
      )}

      {showCash && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-50 space-y-3">
          <p className="text-sm font-medium text-gray-700">নগদ পরিমাণ (বকেয়া: ৳{bill.dueAmount})</p>
          <input
            type="number"
            placeholder={`সর্বোচ্চ ৳${bill.dueAmount}`}
            min="1"
            max={bill.dueAmount}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
            value={cashAmount}
            onChange={e => setCashAmt(e.target.value)}
          />
          <div className="flex gap-2">
            <button onClick={() => { setShowCash(false); setCashAmt('') }}
              className="flex-1 border border-gray-200 py-3 rounded-xl text-sm font-medium text-gray-600">
              বাতিল
            </button>
            <button onClick={handleCash} disabled={paying}
              className="flex-1 bg-green-600 text-white py-3 rounded-xl text-sm font-semibold disabled:bg-green-300">
              {paying ? 'সংরক্ষণ...' : 'নিশ্চিত করুন'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
