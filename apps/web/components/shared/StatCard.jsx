const COLOR_MAP = {
  green: { bg: 'bg-green-50', icon: 'bg-green-100 text-green-600', text: 'text-green-700' },
  blue:  { bg: 'bg-blue-50',  icon: 'bg-blue-100 text-blue-600',   text: 'text-blue-700'  },
  red:   { bg: 'bg-red-50',   icon: 'bg-red-100 text-red-600',     text: 'text-red-700'   },
  gray:  { bg: 'bg-gray-50',  icon: 'bg-gray-100 text-gray-600',   text: 'text-gray-700'  },
}

export function StatCard({ label, value, icon: Icon, color = 'green' }) {
  const c = COLOR_MAP[color] || COLOR_MAP.green
  return (
    <div className={`${c.bg} rounded-2xl p-4`}>
      <div className={`w-10 h-10 ${c.icon} rounded-xl flex items-center justify-center mb-3`}>
        <Icon size={20} />
      </div>
      <p className={`text-xl font-bold ${c.text}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  )
}
