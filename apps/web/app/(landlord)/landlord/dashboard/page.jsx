"use client";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  FileText,
  CalendarDays,
  Wallet,
  BadgeDollarSign,
  ReceiptText,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
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
  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("bn-BD", {
        month: "long",
        year: "numeric",
      }).format(new Date(`${month}-01`)),
    [month],
  );
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
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-emerald-950 via-emerald-800 to-lime-600 px-5 py-6 text-white shadow-[0_24px_80px_-28px_rgba(5,150,105,0.75)] sm:px-6 lg:px-8 lg:py-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_28%),radial-gradient(circle_at_left_center,rgba(187,247,208,0.18),transparent_24%),linear-gradient(135deg,transparent_20%,rgba(255,255,255,0.06)_100%)]" />
        <div className="absolute -right-12 top-0 h-36 w-36 rounded-full border border-white/15 bg-white/10 blur-2xl" />
        <div className="absolute bottom-0 left-0 h-28 w-28 -translate-x-8 translate-y-8 rounded-full bg-lime-200/10 blur-2xl" />

        <div className="relative grid gap-6 lg:grid-cols-[1.45fr_0.9fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium tracking-[0.18em] text-emerald-50/90 uppercase backdrop-blur">
              <CalendarDays className="h-3.5 w-3.5" />
              {monthLabel} সারসংক্ষেপ
            </div>

            <h1 className="mt-4 max-w-2xl text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
              আসসালামু আলাইকুম{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/85 sm:text-[15px]">
              আপনার বাড়িভাড়ার এই মাসের অবস্থা এক জায়গায় দেখুন। আদায়, বকেয়া
              আর সক্রিয় ভাড়াটিয়ার আপডেট এখন হাতের কাছেই।
            </p>

            <div className="mt-5 flex flex-wrap gap-2.5">
              {/* <div className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-black/10 px-3 py-2 text-sm text-emerald-50/90 backdrop-blur">
                <Users className="h-4 w-4 text-lime-200" />
                <span>{loading ? "..." : dashboard?.tenants || r?.activeTenants || 0} জন সক্রিয় ভাড়াটিয়া</span>
              </div> */}
              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-black/10 px-3 py-2 text-sm text-emerald-50/90 backdrop-blur">
                <FileText className="h-4 w-4 text-emerald-100" />
                <span>{month} বিলিং পিরিয়ড</span>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/12 bg-white/10 p-4 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-emerald-100/75">
                    ভাড়াটিয়া
                  </p>
                  <p className="mt-2 text-2xl font-bold text-white">
                    {loading
                      ? "..."
                      : `${dashboard?.tenants || r?.activeTenants || 0} জন`}
                  </p>
                </div>
                <div className="rounded-2xl bg-lime-300/15 p-3 text-lime-100">
                  <Users className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/12 bg-white/10 p-4 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-emerald-100/75">
                    মোট বিল
                  </p>
                  <p className="mt-2 text-2xl font-bold text-white">
                    {loading ? "..." : `৳${r?.totalBilled?.toLocaleString?.() ?? r?.totalBilled ?? 0}`}
                  </p>
                </div>
                <div className="rounded-2xl bg-cyan-300/15 p-3 text-cyan-100">
                  <ReceiptText className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/12 bg-white/10 p-4 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-emerald-100/75">
                    আদায় হয়েছে
                  </p>
                  <p className="mt-2 text-2xl font-bold text-white">
                    {loading ? "..." : `৳${r?.totalCollected?.toLocaleString?.() ?? r?.totalCollected ?? 0}`}
                  </p>
                </div>
                <div className="rounded-2xl bg-emerald-300/15 p-3 text-lime-100">
                  <BadgeDollarSign className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/12 bg-gradient-to-br from-white/12 to-white/5 p-4 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-emerald-100/75">
                    বকেয়া আছে
                  </p>
                  <p className="mt-2 text-2xl font-bold text-white">
                    {loading ? "..." : `৳${r?.totalDue?.toLocaleString?.() ?? r?.totalDue ?? 0}`}
                  </p>
                </div>
                <div className="rounded-2xl bg-amber-300/15 p-3 text-amber-100">
                  <Wallet className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

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
