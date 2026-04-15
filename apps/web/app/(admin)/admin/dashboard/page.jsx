"use client";
import { useQueries } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Users, Building2, Clock, CheckCircle } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
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

  return (
    <div className="py-4 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">অ্যাডমিন প্যানেল</h1>
        <p className="text-gray-500 mt-1">সিস্টেম পর্যবেক্ষণ</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="মোট বাড়ীওয়ালা"
          value={loading ? "..." : (stats?.landlords ?? 0)}
          icon={Building2}
          color="green"
        />
        <StatCard
          label="মোট ভাড়াটে"
          value={loading ? "..." : (stats?.tenants ?? 0)}
          icon={Users}
          color="blue"
        />
        <StatCard
          label="অপেক্ষমাণ আবেদন"
          value={loading ? "..." : (stats?.pendingSubs ?? 0)}
          icon={Clock}
          color="red"
        />
        <StatCard
          label="সক্রিয় সিস্টেম"
          value="✓"
          icon={CheckCircle}
          color="green"
        />
      </div>

      {/* Pending subscriptions */}
      {pending.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-700">অপেক্ষমাণ আবেদন</h2>
            <button
              onClick={() => router.push("/admin/subscriptions")}
              className="text-green-600 text-sm font-medium"
            >
              সব দেখুন
            </button>
          </div>
          <div className="space-y-3">
            {pending.map((s) => (
              <div
                key={s._id}
                className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl"
              >
                <div>
                  <p className="font-medium text-gray-900 text-sm">
                    {s.applicantName}
                  </p>
                  <p className="text-xs text-gray-500">{s.email}</p>
                </div>
                <button
                  onClick={() => router.push("/admin/subscriptions")}
                  className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg font-medium"
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
