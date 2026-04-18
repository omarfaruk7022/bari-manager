"use client";
import { useQueries } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Users, Building2, Clock, CheckCircle, ArrowUpRight } from "lucide-react";
import { request } from "@/lib/query";

export default function AdminDashboard() {
  const router = useRouter();
  const [statsQuery, pendingQuery] = useQueries({
    queries: [
      {
        queryKey: ["admin", "stats"],
        queryFn: () => request({ url: "/admin/stats" }),
      },
      {
        queryKey: ["admin", "subscriptions", "pending"],
        queryFn: () =>
          request({ url: "/admin/subscriptions?status=pending&limit=5" }),
      },
    ],
  });
  const stats = statsQuery.data;
  const pending = pendingQuery.data || [];
  const loading = statsQuery.isLoading || pendingQuery.isLoading;

  const cards = [
    { label: "মোট বাড়ীওয়ালা", value: stats?.landlords ?? 0, icon: Building2, tone: "bg-emerald-700 text-white" },
    { label: "মোট ভাড়াটে", value: stats?.tenants ?? 0, icon: Users, tone: "bg-sky-600 text-white" },
    { label: "অপেক্ষমাণ আবেদন", value: stats?.pendingSubs ?? 0, icon: Clock, tone: "bg-rose-600 text-white" },
    { label: "সক্রিয় সিস্টেম", value: "✓", icon: CheckCircle, tone: "bg-gray-950 text-white" },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-700">আজকের সারাংশ</p>
            <h1 className="mt-1 text-3xl font-black text-gray-950">অ্যাডমিন প্যানেল</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
              বাড়ীওয়ালা, ভাড়াটে, সাবস্ক্রিপশন আবেদন ও সিস্টেম নোটিফিকেশন এক জায়গায় দেখুন।
            </p>
          </div>
          <button
            onClick={() => router.push("/admin/notifications")}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 text-sm font-bold text-white"
          >
            নোটিফিকেশন পাঠান <ArrowUpRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tone}`}>
              <Icon size={19} />
            </div>
            <p className="mt-4 text-sm font-semibold text-gray-500">{label}</p>
            <p className="mt-1 text-3xl font-black text-gray-950">{loading ? "..." : value}</p>
          </div>
        ))}
      </div>

      {/* Pending subscriptions */}
      {pending.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-700">অপেক্ষমাণ আবেদন</h2>
            <button
              onClick={() => router.push("/admin/subscriptions")}
              className="text-sm font-bold text-emerald-700"
            >
              সব দেখুন
            </button>
          </div>
          <div className="space-y-3">
            {pending.map((s) => (
              <div
                key={s._id}
                className="flex items-center justify-between rounded-lg bg-amber-50 p-3"
              >
                <div>
                  <p className="font-medium text-gray-900 text-sm">
                    {s.applicantName}
                  </p>
                  <p className="text-xs text-gray-500">{s.email}</p>
                </div>
                <button
                  onClick={() => router.push("/admin/subscriptions")}
                  className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white"
                >
                  পর্যালোচনা
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
