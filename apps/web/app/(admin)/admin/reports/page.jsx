"use client";

import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { request } from "@/lib/query";

const MONTH_LABELS = ["জানু", "ফেব্রু", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টে", "অক্টো", "নভে", "ডিসে"];

export default function AdminReportsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);

  const [financeQuery, systemStatsQuery] = useQueries({
    queries: [
      {
        queryKey: ["admin", "system-finance", year, month],
        queryFn: () => request({ url: `/admin/reports/system-finance?year=${year}&month=${month}` }),
      },
      {
        queryKey: ["admin", "stats"],
        queryFn: () => request({ url: "/admin/system-stats" }),
      },
    ],
  });

  const finance = financeQuery.data;
  const stats = systemStatsQuery.data;
  const chartData = useMemo(
    () =>
      (finance?.monthlyBreakdown || []).map((item, index) => ({
        name: MONTH_LABELS[index],
        Revenue: item.revenue,
        Expense: item.expenses,
        Profit: item.profit,
      })),
    [finance],
  );

  const yearOptions = useMemo(
    () => Array.from({ length: 5 }, (_, index) => now.getFullYear() - index),
    [now],
  );

  return (
    <div className="space-y-5 py-4">
      <div>
        <h1 className="text-2xl font-black text-gray-950">সিস্টেম রিপোর্ট</h1>
        <p className="text-sm text-gray-500">
          landlord profit report-এর মতো এখানেও মাসভিত্তিক revenue, expense, profit দেখা যাবে।
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium text-gray-700">
          <span>বার্ষিক রিপোর্ট</span>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg border border-gray-200 bg-white px-3 py-3"
          >
            {yearOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-gray-700">
          <span>মাসিক রিপোর্ট</span>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-3"
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <SummaryCard
          icon={Wallet}
          label="ফুল লাইফ revenue"
          value={`৳${Number(finance?.lifetime?.revenue || 0).toLocaleString("bn-BD")}`}
          tone="bg-emerald-700 text-white"
        />
        <SummaryCard
          icon={TrendingDown}
          label="ফুল লাইফ expense"
          value={`৳${Number(finance?.lifetime?.expenses || 0).toLocaleString("bn-BD")}`}
          tone="bg-rose-600 text-white"
        />
        <SummaryCard
          icon={TrendingUp}
          label="ফুল লাইফ profit"
          value={`৳${Number(finance?.lifetime?.profit || 0).toLocaleString("bn-BD")}`}
          tone="bg-sky-600 text-white"
        />
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-4 font-bold text-gray-900">{year} সালের মাসভিত্তিক রিপোর্ট</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value) => `৳${Number(value).toLocaleString("bn-BD")}`} />
            <Bar dataKey="Revenue" fill="#047857" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Expense" fill="#e11d48" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Profit" fill="#0284c7" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-bold text-gray-900">{month} মাসের profit report</h2>
          <div className="space-y-3">
            <Row label="Revenue" value={finance?.monthly?.revenue} />
            <Row label="Expense" value={finance?.monthly?.expenses} />
            <Row label="Profit" value={finance?.monthly?.profit} highlight />
            <Row label="Approved subscription" value={finance?.monthly?.approvedSubscriptions} suffix="টি" />
            <Row label="Expense entry" value={finance?.monthly?.expenseEntries} suffix="টি" />
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-bold text-gray-900">ড্যাশবোর্ড সমষ্টি</h2>
          <div className="space-y-3">
            <Row label="লাইফটাইম subscription revenue" value={stats?.totalSubscriptionRevenue} />
            <Row label="লাইফটাইম system expense" value={stats?.totalExpense} />
            <Row label="লাইফটাইম profit" value={stats?.totalProfit} highlight />
            <Row label="মোট landlord" value={stats?.totalLandlords} suffix="জন" />
            <Row label="মোট tenant" value={stats?.totalTenants} suffix="জন" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tone}`}>
        <Icon size={18} />
      </div>
      <p className="mt-3 text-sm font-semibold text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-gray-950">{value}</p>
    </div>
  );
}

function Row({ label, value, suffix = "", highlight = false }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-3">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-sm font-bold ${highlight ? "text-emerald-700" : "text-gray-900"}`}>
        {typeof value === "number" && !suffix ? `৳${value.toLocaleString("bn-BD")}` : `${Number(value || 0).toLocaleString("bn-BD")}${suffix}`}
      </span>
    </div>
  );
}
