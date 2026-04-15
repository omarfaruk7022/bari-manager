'use client'
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { request } from '@/lib/query'

const METHOD_LABEL = { bkash: 'bKash', cash: 'নগদ', bank_transfer: 'ব্যাংক' }
const STATUS_COLOR = { success: 'text-green-600 bg-green-50', pending: 'text-yellow-600 bg-yellow-50', failed: 'text-red-600 bg-red-50' }
const STATUS_LABEL = { success: 'সফল', pending: 'অপেক্ষমাণ', failed: 'ব্যর্থ' }

export default function TenantPaymentsPage() {
  const searchParams = useSearchParams()
  const { data: payments = [], isLoading: loading } = useQuery({
    queryKey: ['tenant', 'payments'],
    queryFn: () => request({ url: '/tenant/payments' }),
  })

  useEffect(() => {
    const status = searchParams.get('status')
    if (status === 'success') toast.success('পেমেন্ট সফল হয়েছে!')
    if (status === 'failed')  toast.error('পেমেন্ট ব্যর্থ হয়েছে। আবার চেষ্টা করুন।')
  }, [searchParams])

  return (
    <div className="py-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">পেমেন্ট ইতিহাস</h1>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>এখনো কোনো পেমেন্ট নেই</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map(p => (
            <div key={p._id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">৳{p.amount.toLocaleString()}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {p.billId?.month} মাস • {METHOD_LABEL[p.method] || p.method}
                  </p>
                  {p.bkashTxId && (
                    <p className="text-xs text-gray-400 mt-1">TxID: {p.bkashTxId}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {p.paidAt ? new Date(p.paidAt).toLocaleDateString('bn-BD') : new Date(p.createdAt).toLocaleDateString('bn-BD')}
                  </p>
                </div>
                <span className={`text-xs font-medium px-3 py-1 rounded-full ${STATUS_COLOR[p.status]}`}>
                  {STATUS_LABEL[p.status]}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
