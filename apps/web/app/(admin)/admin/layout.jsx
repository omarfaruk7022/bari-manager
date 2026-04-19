"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut, ShieldCheck } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { NAV_CONFIG } from "@/components/shared/BottomNav";
import { useAuth } from "@/hooks/useAuth";

export default function AdminLayout({ children }) {
  function AdminShell() {
    const pathname = usePathname();
    const router = useRouter();
    const { logout } = useAuth();
    const items = NAV_CONFIG.admin;

    return (
      <AuthGuard role="admin">
        <div className="min-h-screen bg-[#f7f8f4] text-gray-950">
          <aside className="fixed left-0 top-0 z-40 hidden h-screen w-72 border-r border-gray-200 bg-white px-4 py-5 shadow-sm lg:block">
            <div className="flex items-center gap-3 px-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-700 text-sm font-bold text-white">
                বা
              </div>
              <div>
                <p className="text-lg font-black">BariManager</p>
                <p className="text-xs font-medium text-gray-500">
                  সুপার অ্যাডমিন
                </p>
              </div>
            </div>

            <nav className="mt-8 space-y-1">
              {items.map(({ href, icon: Icon, label }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold transition ${
                      active
                        ? "bg-emerald-700 text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-950"
                    }`}
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="absolute bottom-5 left-4 right-4 rounded-lg border border-gray-200 bg-[#f7f8f4] p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
                <ShieldCheck size={17} className="text-emerald-700" />
                সম্পূর্ণ নিয়ন্ত্রণ
              </div>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                বাড়ীওয়ালা, ভাড়াটে, আবেদন, নোটিফিকেশন ও সেটিংস এক জায়গায়।
              </p>
            </div>
          </aside>

          <div className="lg:pl-72">
            <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
              <div className="flex h-16 items-center justify-between px-4 lg:px-8">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    Admin console
                  </p>
                  <p className="text-lg font-black text-gray-950">
                    সিস্টেম ড্যাশবোর্ড
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push("/admin/notifications")}
                    className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                  >
                    <Bell size={21} />
                  </button>
                  <button
                    onClick={logout}
                    className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                  >
                    <LogOut size={21} />
                  </button>
                </div>
              </div>
            </header>

            <main className="px-4 pb-24 pt-5 lg:px-8 lg:pb-10">
              <div className="mx-auto max-w-full">{children}</div>
            </main>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return <AdminShell />;
}
