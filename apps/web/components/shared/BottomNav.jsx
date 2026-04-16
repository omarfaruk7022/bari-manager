"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Users, Receipt, BarChart3,
  Bell, Settings, ShieldCheck, CreditCard
} from "lucide-react";

export const NAV_CONFIG = {
  landlord: [
    { href: "/landlord/dashboard",  icon: Home,      label: "হোম" },
    { href: "/landlord/tenants",    icon: Users,      label: "ভাড়াটে" },
    { href: "/landlord/bills",      icon: Receipt,    label: "বিল" },
    { href: "/landlord/reports",    icon: BarChart3,  label: "রিপোর্ট" },
    { href: "/landlord/settings",   icon: Settings,   label: "সেটিংস" },
  ],
  tenant: [
    { href: "/tenant/dashboard",    icon: Home,       label: "হোম" },
    { href: "/tenant/bills",        icon: Receipt,    label: "বিল" },
    { href: "/tenant/payments",     icon: CreditCard, label: "পেমেন্ট" },
    { href: "/tenant/notices",      icon: Bell,       label: "নোটিশ" },
    { href: "/tenant/settings",     icon: Settings,   label: "সেটিংস" },
  ],
  admin: [
    { href: "/admin/dashboard",     icon: Home,       label: "হোম" },
    { href: "/admin/landlords",     icon: Users,      label: "বাড়ীওয়ালা" },
    { href: "/admin/tenants",       icon: Users,      label: "ভাড়াটে" },
    { href: "/admin/subscriptions", icon: Receipt,    label: "আবেদন" },
    { href: "/admin/config",        icon: ShieldCheck,label: "কনফিগ" },
  ],
};

export function BottomNav({ role = "landlord" }) {
  const path = usePathname();
  const items = NAV_CONFIG[role] || NAV_CONFIG.landlord;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-lg safe-area-pb">
      <div className="flex items-stretch max-w-xl mx-auto">
        {items.map(({ href, icon: Icon, label }) => {
          const active = path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                active ? "text-green-600" : "text-gray-400 hover:text-gray-700"
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
