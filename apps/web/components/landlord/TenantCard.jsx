import { Phone, Home, ChevronRight } from 'lucide-react'

export function TenantCard({ tenant, onView }) {
  return (
    <button
      onClick={onView}
      className="w-full bg-white rounded-2xl p-4 shadow-sm text-left flex items-center justify-between gap-3 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Avatar */}
        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-green-700 font-bold text-lg">{tenant.name[0]}</span>
        </div>
        {/* Info */}
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{tenant.name}</p>
          <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
            <Home size={13} />
            <span>ফ্ল্যাট {tenant.propertyId?.unitNumber || '—'}</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
            <Phone size={13} />
            <span>{tenant.phone}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-800">৳{tenant.monthlyRent?.toLocaleString()}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tenant.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {tenant.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
          </span>
        </div>
        <ChevronRight size={18} className="text-gray-300" />
      </div>
    </button>
  )
}
