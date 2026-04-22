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
const MONTH_OPTIONS = [1, 3, 6, 12, 24];
const APPROVAL_TYPE_LABELS = {
  personal: "Personal",
  commercial: "Commercial",
};

const planName = (plans, key) => plans?.[key]?.name || PLAN_LABELS[key || "basic"] || "Basic";
const planPrice = (plans, key, snapshot) =>
  snapshot ?? plans?.[key]?.price ?? PLAN_PRICES[key || "basic"] ?? 0;

export default function AdminSubscriptionsPage() {
  const [filter, setFilter] = useState("pending");
  const [acting, setActing] = useState(null);
  const [selectedPlans, setSelectedPlans] = useState({});
  const [selectedApprovalTypes, setSelectedApprovalTypes] = useState({});
  const [selectedApprovalMonths, setSelectedApprovalMonths] = useState({});
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
    mutationFn: ({ id, requestedPlan, approvalCategory, approvalMonths }) =>
      api.put(`/admin/subscriptions/${id}/approve`, {
        requestedPlan,
        approvalCategory,
        approvalMonths,
      }),
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

  const approve = async (id, requestedPlan, approvalCategory, approvalMonths) => {
    setActing(id + "-approve");
    approveMutation.mutate(
      { id, requestedPlan, approvalCategory, approvalMonths },
      { onSettled: () => setActing(null) },
    );
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
            const selectedPlanKey = selectedPlans[s._id] || s.requestedPlan || "basic";
            const currentApprovalType =
              selectedApprovalTypes[s._id] || s.approvalCategory || "commercial";
            const currentApprovalMonths =
              selectedApprovalMonths[s._id] || s.requestedMonths || s.approvalMonths || 1;
            const currentMonthlyPrice = planPrice(plans, selectedPlanKey, s.requestedPlanPrice);
            const currentTotal =
              currentApprovalType === "personal"
                ? 0
                : Number(currentMonthlyPrice || 0) * Number(currentApprovalMonths || 1);
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
                    <p>
                      <strong>চাওয়া মেয়াদ:</strong> {Number(s.requestedMonths || 1).toLocaleString("bn-BD")} মাস
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
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        অনুমোদনের প্ল্যান
                      </label>
                      <select
                        value={selectedPlanKey}
                        onChange={(e) =>
                          setSelectedPlans((current) => ({
                            ...current,
                            [s._id]: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm"
                      >
                        {Object.keys(plans || PLAN_LABELS).map((planKey) => (
                          <option key={planKey} value={planKey}>
                            {planName(plans, planKey)} · ৳
                            {planPrice(plans, planKey).toLocaleString("bn-BD")}/মাস
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        অনুমোদনের ধরন
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(APPROVAL_TYPE_LABELS).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() =>
                              setSelectedApprovalTypes((current) => ({
                                ...current,
                                [s._id]: value,
                              }))
                            }
                            className={`rounded-xl border px-3 py-3 text-sm font-medium ${
                              currentApprovalType === value
                                ? "border-green-600 bg-green-50 text-green-700"
                                : "border-gray-200 bg-white text-gray-700"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        অনুমোদনের মেয়াদ
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={
                            MONTH_OPTIONS.includes(Number(currentApprovalMonths))
                              ? Number(currentApprovalMonths)
                              : "custom"
                          }
                          onChange={(e) => {
                            if (e.target.value === "custom") return;
                            setSelectedApprovalMonths((current) => ({
                              ...current,
                              [s._id]: Number(e.target.value),
                            }));
                          }}
                          disabled={currentApprovalType === "personal"}
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm disabled:bg-gray-100"
                        >
                          {MONTH_OPTIONS.map((month) => (
                            <option key={month} value={month}>
                              {month} মাস
                            </option>
                          ))}
                          <option value="custom">Custom</option>
                        </select>
                        <input
                          type="number"
                          min="1"
                          value={currentApprovalMonths}
                          onChange={(e) =>
                            setSelectedApprovalMonths((current) => ({
                              ...current,
                              [s._id]: Math.max(1, Number(e.target.value || 1)),
                            }))
                          }
                          disabled={currentApprovalType === "personal"}
                          className="w-28 rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm disabled:bg-gray-100"
                        />
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        {currentApprovalType === "personal"
                          ? "Personal approval হলে রিপোর্টে কোনো subscription amount যোগ হবে না।"
                          : `মোট বিল হবে ৳${currentTotal.toLocaleString("bn-BD")}`}
                      </p>
                    </div>
                    <div className="flex gap-3">
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
                      onClick={() =>
                        approve(
                          s._id,
                          selectedPlanKey,
                          currentApprovalType,
                          currentApprovalType === "personal" ? 1 : Number(currentApprovalMonths || 1),
                        )
                      }
                      disabled={!!acting}
                      className="flex-1 bg-green-600 text-white py-3 rounded-xl font-medium text-sm disabled:opacity-50"
                    >
                      {acting === s._id + "-approve"
                        ? "প্রক্রিয়াধীন..."
                        : "অনুমোদন করুন"}
                    </button>
                    </div>
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
