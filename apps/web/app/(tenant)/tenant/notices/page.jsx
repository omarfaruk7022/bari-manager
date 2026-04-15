'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck } from 'lucide-react'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { request } from '@/lib/query'

const TYPE_COLOR = {
  bill_ready:        'bg-blue-50 text-blue-700',
  payment_due:       'bg-red-50 text-red-700',
  payment_received:  'bg-green-50 text-green-700',
  notice:            'bg-yellow-50 text-yellow-700',
  system:            'bg-gray-50 text-gray-700',
}

export default function TenantNoticesPage() {
  const queryClient = useQueryClient()
  const { data: notifs = [], isLoading: loading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => request({ url: '/notifications' }),
  })
  const markReadMutation = useMutation({
    mutationFn: () => api.put('/notifications/mark-read'),
    onSuccess: async () => {
      toast.success('সব পড়া হয়েছে')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['notifications'] }),
        queryClient.invalidateQueries({ queryKey: ['auth', 'me'] }),
      ])
    },
  })

  const unread = notifs.filter(n => !n.isRead).length

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900">নোটিফিকেশন</h1>
          {unread > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unread}</span>
          )}
        </div>
        {unread > 0 && (
          <button
            onClick={() => markReadMutation.mutate()}
            className="flex items-center gap-1 text-sm text-green-600 font-medium"
          >
            <CheckCheck size={16} /> সব পড়া হয়েছে
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : notifs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>কোনো নোটিফিকেশন নেই</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map(n => (
            <div key={n._id} className={`rounded-2xl p-4 border ${n.isRead ? 'bg-white border-gray-100' : 'bg-green-50 border-green-200'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${n.isRead ? 'bg-gray-300' : 'bg-green-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-base">{n.title}</p>
                  <p className="text-gray-600 text-sm mt-1">{n.body}</p>
                  <p className="text-gray-400 text-xs mt-2">
                    {new Date(n.createdAt).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
