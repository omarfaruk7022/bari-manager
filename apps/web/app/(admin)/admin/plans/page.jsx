"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Save, Tags } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { request } from "@/lib/query";

const PLAN_ORDER = ["basic", "standard", "premium", "enterprise"];

export default function AdminPlansPage() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState({});

  const { data: plans = {}, isLoading } = useQuery({
    queryKey: ["admin", "plans"],
    queryFn: () => request({ url: "/admin/plans" }),
  });

  useEffect(() => {
    if (Object.keys(plans).length) setDraft(plans);
  }, [plans]);

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.put("/admin/plans", { plans: payload });
      return res.data;
    },
    onSuccess: async () => {
      toast.success("প্ল্যান আপডেট হয়েছে");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "plans"] }),
        queryClient.invalidateQueries({ queryKey: ["public", "plans"] }),
      ]);
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "প্ল্যান সংরক্ষণ করা যায়নি"),
  });

  const updatePlan = (key, field, value) => {
    setDraft((current) => ({
      ...current,
      [key]: {
        ...current[key],
        [field]: value,
      },
    }));
  };

  const save = () => {
    if (!Object.keys(draft).length) return toast.error("প্ল্যান লোড হয়নি");
    saveMutation.mutate(draft);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-700 text-white">
              <Tags size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-950">সাবস্ক্রিপশন প্ল্যান</h1>
              <p className="text-sm text-gray-500">
                মূল্য, SMS, ফ্ল্যাট, রিপোর্ট, অটো বিল, চ্যাট এবং Google Ads অ্যাক্সেস পরিবর্তন করুন।
              </p>
            </div>
          </div>
          <button
            onClick={save}
            disabled={saveMutation.isPending || isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {saveMutation.isPending ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            সংরক্ষণ করুন
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-80 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {PLAN_ORDER.map((key) => {
            const plan = draft[key];
            if (!plan) return null;

            return (
              <div key={key} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                      {key}
                    </p>
                    <input
                      value={plan.name || ""}
                      onChange={(e) => updatePlan(key, "name", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xl font-black text-gray-950"
                    />
                  </div>
                  <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={!!plan.autoBill}
                      onChange={(e) => updatePlan(key, "autoBill", e.target.checked)}
                      className="accent-emerald-700"
                    />
                    অটো বিল
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={!!plan.googleAds}
                      onChange={(e) => updatePlan(key, "googleAds", e.target.checked)}
                      className="accent-emerald-700"
                    />
                    Google Ads
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={!!plan.communityChat}
                      onChange={(e) => updatePlan(key, "communityChat", e.target.checked)}
                      className="accent-emerald-700"
                    />
                    কমিউনিটি চ্যাট
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <NumberField
                    label="মূল্য / মাস"
                    value={plan.price}
                    onChange={(value) => updatePlan(key, "price", value)}
                  />
                  <NumberField
                    label="SMS লিমিট"
                    value={plan.smsLimit}
                    onChange={(value) => updatePlan(key, "smsLimit", value)}
                  />
                  <NumberField
                    label="ফ্ল্যাট / ইউনিট লিমিট"
                    value={plan.flatLimit}
                    onChange={(value) => updatePlan(key, "flatLimit", value)}
                  />
                  <NumberField
                    label="রিপোর্ট দেখা যাবে (মাস)"
                    value={plan.reportMonths}
                    onChange={(value) => updatePlan(key, "reportMonths", value)}
                  />
                </div>

                <div className="mt-4">
                  <label className="mb-2 block text-sm font-bold text-gray-700">
                    ফিচার টেক্সট
                  </label>
                  <textarea
                    rows={4}
                    value={(plan.features || []).join("\n")}
                    onChange={(e) =>
                      updatePlan(
                        key,
                        "features",
                        e.target.value
                          .split("\n")
                          .map((item) => item.trim())
                          .filter(Boolean),
                      )
                    }
                    className="w-full resize-none rounded-lg border border-gray-200 px-3 py-3 text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    placeholder="প্রতি লাইনে একটি ফিচার লিখুন"
                  />
                </div>

                <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                  <span className="font-bold text-gray-900">প্রিভিউ:</span>{" "}
                  ৳{Number(plan.price || 0).toLocaleString("bn-BD")}/মাস ·{" "}
                  {Number(plan.flatLimit || 0).toLocaleString("bn-BD")} ফ্ল্যাট ·{" "}
                  {Number(plan.smsLimit || 0).toLocaleString("bn-BD")} SMS ·{" "}
                  {Number(plan.reportMonths || 0).toLocaleString("bn-BD")} মাস রিপোর্ট
                  {plan.autoBill ? " · অটো বিল" : ""}
                  {plan.communityChat ? " · কমিউনিটি চ্যাট" : ""}
                  {plan.googleAds ? " · Google Ads" : ""}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NumberField({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-gray-500">{label}</span>
      <input
        type="number"
        min="0"
        value={value ?? 0}
        onChange={(e) => onChange(Number(e.target.value || 0))}
        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
      />
    </label>
  );
}
