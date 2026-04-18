"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import api from "@/lib/api";
import { request } from "@/lib/query";

const STATUS_CONFIG = {
  pending: {
    label: "অপেক্ষমাণ",
    color: "bg-yellow-100 text-yellow-800",
    icon: Clock,
  },
  approved: {
    label: "অনুমোদিত",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
  },
  rejected: {
    label: "প্রত্যাখ্যাত",
    color: "bg-red-100 text-red-800",
    icon: XCircle,
  },
};

const PLAN_LABELS = {
  basic: "Basic",
  standard: "Standard",
  premium: "Premium",
  enterprise: "Enterprise",
};

const PLAN_PRICES = {
  basic: 499,
  standard: 999,
  premium: 1999,
  enterprise: 4999,
};

const planName = (plans, key) => plans?.[key]?.name || PLAN_LABELS[key || "basic"] || "Basic";
const planPrice = (plans, key, snapshot) =>
  snapshot ?? plans?.[key]?.price ?? PLAN_PRICES[key || "basic"] ?? 0;

export default function AdminSubscriptionsPage() {
  const [filter, setFilter] = useState("pending");
  const [acting, setActing] = useState(null);
  const queryClient = useQueryClient();
  const { data: subs = [], isLoading: loading } = useQuery({
    queryKey: ["admin", "subscriptions", filter],
    queryFn: () => request({ url: `/admin/subscriptions?status=${filter}` }),
  });
  const { data: plans } = useQuery({
    queryKey: ["admin", "plans"],
    queryFn: () => request({ url: "/admin/plans" }),
  });
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["admin", "subscriptions", filter],
      }),
      queryClient.invalidateQueries({
        queryKey: ["admin", "subscriptions", "pending"],
      }),
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] }),
    ]);
  const approveMutation = useMutation({
    mutationFn: (id) => api.put(`/admin/subscriptions/${id}/approve`),
    onSuccess: async (res) => {
      toast.success(res.data.message);
      await refresh();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "সমস্যা হয়েছে"),
  });
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) =>
      api.put(`/admin/subscriptions/${id}/reject`, { reason }),
    onSuccess: async () => {
      toast.success("প্রত্যাখ্যান করা হয়েছে");
      await refresh();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "সমস্যা হয়েছে"),
  });

  const approve = async (id) => {
    setActing(id + "-approve");
    approveMutation.mutate(id, { onSettled: () => setActing(null) });
  };

  const reject = async (id) => {
    const reason = prompt("প্রত্যাখ্যানের কারণ লিখুন:");
    if (reason === null) return;
    setActing(id + "-reject");
    rejectMutation.mutate(
      { id, reason: reason || "কারণ উল্লেখ নেই" },
      { onSettled: () => setActing(null) },
    );
  };

  return (
    <div className="py-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">সাবস্ক্রিপশন আবেদন</h1>

      {/* Filter tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
        {["pending", "approved", "rejected"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              filter === s
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500"
            }`}
          >
            {STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-36 bg-gray-100 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : subs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>কোনো আবেদন নেই</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subs.map((s) => {
            const cfg = STATUS_CONFIG[s.status];
            return (
              <div
                key={s._id}
                className="bg-white rounded-2xl p-4 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-gray-900">{s.applicantName}</p>
                    <p className="text-sm text-gray-500">{s.email}</p>
                    <p className="text-sm text-gray-500">{s.phone}</p>
                  </div>
                  <span
                    className={`text-xs font-medium px-3 py-1 rounded-full ${cfg.color}`}
                  >
                    {cfg.label}
                  </span>
                </div>

                {s.propertyName && (
                  <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
                    <p>
                      <strong>বাড়ির নাম:</strong> {s.propertyName}
                    </p>
                    {s.propertyAddress && (
                      <p>
                        <strong>ঠিকানা:</strong> {s.propertyAddress}
                      </p>
                    )}
                    {s.totalUnits && (
                      <p>
                        <strong>ফ্ল্যাট সংখ্যা:</strong> {s.totalUnits}
                      </p>
                    )}
                    <p>
                      <strong>প্ল্যান:</strong>{" "}
                      {planName(plans, s.requestedPlan || "basic")}
                    </p>
                    <p>
                      <strong>মূল্য:</strong> ৳
                      {planPrice(plans, s.requestedPlan || "basic", s.requestedPlanPrice).toLocaleString("bn-BD")}
                      /মাস
                    </p>
                  </div>
                )}

                {s.rejectionReason && (
                  <div className="bg-red-50 rounded-xl p-3 text-sm text-red-700">
                    <strong>কারণ:</strong> {s.rejectionReason}
                  </div>
                )}

                <p className="text-xs text-gray-400">
                  আবেদনের তারিখ:{" "}
                  {new Date(s.createdAt).toLocaleDateString("bn-BD")}
                </p>

                {s.status === "pending" && (
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => reject(s._id)}
                      disabled={!!acting}
                      className="flex-1 border border-red-200 text-red-600 py-3 rounded-xl font-medium text-sm disabled:opacity-50"
                    >
                      {acting === s._id + "-reject"
                        ? "প্রক্রিয়াধীন..."
                        : "প্রত্যাখ্যান"}
                    </button>
                    <button
                      onClick={() => approve(s._id)}
                      disabled={!!acting}
                      className="flex-1 bg-green-600 text-white py-3 rounded-xl font-medium text-sm disabled:opacity-50"
                    >
                      {acting === s._id + "-approve"
                        ? "প্রক্রিয়াধীন..."
                        : "অনুমোদন করুন"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
