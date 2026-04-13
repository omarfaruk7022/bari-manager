'use client'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Users, FileText, TrendingUp, Bell, Home, CreditCard, Receipt } from 'lucide-react'

const NAV_CONFIG = {
  landlord: [
    { label: 'হোম',     icon: LayoutDashboard, path: '/landlord/dashboard' },
    { label: 'ভাড়াটে', icon: Users,            path: '/landlord/tenants'  },
    { label: 'বিল',     icon: FileText,         path: '/landlord/bills'    },
    { label: 'খরচ',     icon: Receipt,          path: '/landlord/expenses' },
    { label: 'রিপোর্ট', icon: TrendingUp,       path: '/landlord/reports'  },
  ],
  tenant: [
    { label: 'হোম',       icon: Home,        path: '/tenant/dashboard' },
    { label: 'বিল',       icon: FileText,    path: '/tenant/bills'     },
    { label: 'পেমেন্ট',  icon: CreditCard,  path: '/tenant/payments'  },
    { label: 'নোটিশ',    icon: Bell,        path: '/tenant/notices'   },
  ],
  admin: [
    { label: 'হোম',        icon: LayoutDashboard, path: '/admin/dashboard'      },
    { label: 'আবেদন',     icon: FileText,         path: '/admin/subscriptions'  },
    { label: 'ল্যান্ডলর্ড', icon: Users,           path: '/admin/landlords'      },
  ],
}

export function BottomNav({ role }) {
  const pathname = usePathname()
  const router   = useRouter()
  const items    = NAV_CONFIG[role] || []

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40 safe-area-pb">
      <div className="max-w-2xl mx-auto flex">
        {items.map(({ label, icon: Icon, path }) => {
          const active = pathname.startsWith(path)
          return (
            <button
              key={path}
              onClick={() => router.push(path)}
              className="flex-1 flex flex-col items-center justify-center py-3 gap-1"
            >
              <Icon
                size={22}
                className={active ? 'text-green-600' : 'text-gray-400'}
                strokeWidth={active ? 2.5 : 1.8}
              />
              <span className={`text-xs font-medium ${active ? 'text-green-600' : 'text-gray-400'}`}>
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
