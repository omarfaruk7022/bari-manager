"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { NAV_CONFIG } from "./BottomNav";

export function DesktopNav({ role }) {
  const pathname = usePathname();
  const items = NAV_CONFIG[role] || [];

  return (
    <aside className="hidden lg:block lg:w-64 lg:flex-shrink-0">
      <div className="sticky top-20 space-y-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
        {items.map(({ label, icon: Icon, href }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                active
                  ? "bg-green-50 text-green-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
