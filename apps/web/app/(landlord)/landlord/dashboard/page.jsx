"use client";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, FileText, TrendingUp, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { StatCard } from "@/components/shared/StatCard";
import { RecentBills } from "@/components/landlord/RecentBills";
import { request } from "@/lib/query";

export default function LandlordDashboard() {
  const { user } = useAuth();
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const { data: dashboard, isLoading: loading } = useQuery({
    queryKey: ["landlord", "dashboard", month],
    queryFn: async () => {
      const [tenants, report] = await Promise.all([
        request({ url: "/landlord/tenants?active=true&limit=1" }),
        request({ url: `/landlord/reports/monthly?month=${month}` }),
      ]);
      return { tenants: tenants.total || 0, report };
    },
  });
  const r = dashboard?.report;
  const summary = useMemo(
    () => [
      {
        label: "পরিশোধিত",
        value: r?.statusBreakdown?.paid ?? 0,
        tone: "green",
      },
      {
        label: "আংশিক",
        value: r?.statusBreakdown?.partial ?? 0,
        tone: "amber",
      },
      {
        label: "অপরিশোধিত",
        value: r?.statusBreakdown?.unpaid ?? 0,
        tone: "red",
      },
    ],
    [r],
  );

  return (
    <div className="space-y-6 pb-4">
      <section className="overflow-hidden rounded-lg bg-green-500 px-5 py-6 text-white">
        <p className="text-sm text-green-200">{month} মাসের সারসংক্ষেপ</p>
        <h1 className="mt-2 text-2xl font-bold lg:text-3xl">
          আসসালামু আলাইকুম{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!
        </h1>
        {/* <p className="mt-2 max-w-2xl text-sm text-slate-300">ডেস্কটপে এখন ড্যাশবোর্ডটা পূর্ণ প্রস্থে কাজ করবে, আর মোবাইলের ছোট কার্ড অভিজ্ঞতাও ঠিক থাকবে।</p> */}
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="বসবাসরত ভাড়াটিয়া "
          value={loading ? "..." : dashboard?.tenants || r?.activeTenants}
          icon={Users}
          color="green"
        />
        <StatCard
          label="মোট বিল"
          value={loading ? "..." : `৳${r?.totalBilled ?? 0}`}
          icon={FileText}
          color="blue"
        />
        <StatCard
          label="আদায় হয়েছে"
          value={loading ? "..." : `৳${r?.totalCollected ?? 0}`}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          label="বকেয়া"
          value={loading ? "..." : `৳${r?.totalDue ?? 0}`}
          icon={AlertCircle}
          color="red"
        />
      </div>

      {r && (
        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-700">বিলের অবস্থা</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {summary.map((item) => (
                <div
                  key={item.label}
                  className={`rounded-lg p-4 text-center ${
                    item.tone === "green"
                      ? "bg-green-50"
                      : item.tone === "amber"
                        ? "bg-amber-50"
                        : "bg-red-50"
                  }`}
                >
                  <p
                    className={`text-2xl font-bold ${
                      item.tone === "green"
                        ? "text-green-600"
                        : item.tone === "amber"
                          ? "text-amber-600"
                          : "text-red-600"
                    }`}
                  >
                    {item.value}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-500">খরচ</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                ৳{r.totalExpenses?.toLocaleString?.() ?? r.totalExpenses}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-500">নিট লাভ</p>
              <p className="mt-2 text-2xl font-bold text-emerald-600">
                ৳{r.profit?.toLocaleString?.() ?? r.profit}
              </p>
            </div>
          </div>
        </section>
      )}

      <RecentBills />
    </div>
  );
}
