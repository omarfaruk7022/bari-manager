"use client";
import { useQueries } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Building2, Clock, CheckCircle, ArrowUpRight, Wallet, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { request } from "@/lib/query";

export default function AdminDashboard() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const [reportYear, setReportYear] = useState(currentYear);
  const [statsQuery, pendingQuery, systemFinanceQuery] = useQueries({
    queries: [
      {
        queryKey: ["admin", "stats"],
        queryFn: () => request({ url: "/admin/system-stats" }),
      },
      {
        queryKey: ["admin", "subscriptions", "pending"],
        queryFn: () =>
          request({ url: "/admin/subscriptions?status=pending&limit=5" }),
      },
      {
        queryKey: ["admin", "reports", "system-finance", reportYear],
        queryFn: () =>
          request({ url: `/admin/reports/system-finance?year=${reportYear}&month=${reportYear}-${String(new Date().getMonth() + 1).padStart(2, "0")}` }),
      },
    ],
  });
  const stats = statsQuery.data;
  const pending = pendingQuery.data || [];
  const finance = systemFinanceQuery.data;
  const loading = statsQuery.isLoading || pendingQuery.isLoading;
  const reportYears = useMemo(
    () => Array.from({ length: 5 }, (_, index) => currentYear - index),
    [currentYear],
  );

  const cards = [
    { label: "মোট বাড়ীওয়ালা", value: stats?.totalLandlords ?? 0, icon: Building2, tone: "bg-emerald-700 text-white" },
    { label: "মোট ভাড়াটে", value: stats?.totalTenants ?? 0, icon: Users, tone: "bg-sky-600 text-white" },
    { label: "অপেক্ষমাণ আবেদন", value: pending.length ?? 0, icon: Clock, tone: "bg-rose-600 text-white" },
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

      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard
          icon={Wallet}
          label="ফুল লাইফ revenue"
          value={`৳${Number(finance?.lifetime?.revenue || 0).toLocaleString("bn-BD")}`}
          tone="bg-emerald-700 text-white"
        />
        <MetricCard
          icon={TrendingDown}
          label="ফুল লাইফ expense"
          value={`৳${Number(finance?.lifetime?.expenses || 0).toLocaleString("bn-BD")}`}
          tone="bg-rose-600 text-white"
        />
        <MetricCard
          icon={TrendingUp}
          label="ফুল লাইফ profit"
          value={`৳${Number(finance?.lifetime?.profit || 0).toLocaleString("bn-BD")}`}
          tone="bg-sky-600 text-white"
        />
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

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold text-gray-800">সিস্টেম finance রিপোর্ট</h2>
            <p className="text-sm text-gray-500">
              সুপার অ্যাডমিন এখান থেকে মাসভিত্তিক revenue, expense, profit দেখতে পারবেন।
            </p>
          </div>
          <button
            onClick={() => router.push("/admin/reports")}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-950 px-4 py-2 text-sm font-bold text-white"
          >
            বিস্তারিত রিপোর্ট <BarChart3 size={16} />
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <MetricCard
            icon={Wallet}
            label={`${reportYear} revenue`}
            value={`৳${Number(finance?.yearly?.revenue || 0).toLocaleString("bn-BD")}`}
            tone="bg-emerald-700 text-white"
          />
          <MetricCard
            icon={TrendingDown}
            label={`${reportYear} expense`}
            value={`৳${Number(finance?.yearly?.expenses || 0).toLocaleString("bn-BD")}`}
            tone="bg-rose-600 text-white"
          />
          <MetricCard
            icon={TrendingUp}
            label={`${reportYear} profit`}
            value={`৳${Number(finance?.yearly?.profit || 0).toLocaleString("bn-BD")}`}
            tone="bg-sky-600 text-white"
          />
        </div>

        <div className="mt-4 space-y-2">
          {(finance?.monthlyBreakdown || []).map((item) => (
            <div
              key={item.month}
              className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"
            >
              <span className="font-medium text-gray-700">{item.month}</span>
              <span className="text-gray-500">
                খরচ ৳{Number(item.expenses || 0).toLocaleString("bn-BD")}
              </span>
              <span className="font-bold text-gray-900">
                লাভ ৳{Number(item.profit || 0).toLocaleString("bn-BD")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tone}`}>
        <Icon size={18} />
      </div>
      <p className="mt-3 text-sm font-semibold text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-gray-950">{value}</p>
    </div>
  );
}
