"use client";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { CheckCircle, ArrowLeft } from "lucide-react";
import api from "@/lib/api";
import { request } from "@/lib/query";

const MONTH_OPTIONS = [1, 3, 6, 12, 24];

const FALLBACK_PLANS = [
  {
    value: "basic",
    name: "Basic",
    price: 499,
    desc: "৫ ফ্ল্যাট, ২০ SMS, ১ মাস রিপোর্ট",
  },
  {
    value: "standard",
    name: "Standard",
    price: 999,
    desc: "২০ ফ্ল্যাট, ১০০ SMS, ৬ মাস রিপোর্ট, অটো বিল",
  },
  {
    value: "premium",
    name: "Premium",
    price: 1999,
    desc: "৭৫ ফ্ল্যাট, ৩০০ SMS, ১২ মাস রিপোর্ট, অটো বিল",
  },
  {
    value: "enterprise",
    name: "Enterprise",
    price: 4999,
    desc: "৩০০ ফ্ল্যাট, ১০০০ SMS, ৩৬ মাস রিপোর্ট, অটো বিল",
  },
];

const planList = (plans) =>
  Object.entries(plans || {}).map(([value, plan]) => ({
    value,
    ...plan,
    desc: Array.isArray(plan.features)
      ? plan.features.join(", ")
      : `${plan.flatLimit} ফ্ল্যাট, ${plan.smsLimit} SMS, ${plan.reportMonths} মাস রিপোর্ট${plan.autoBill ? ", অটো বিল" : ""}${plan.googleAds ? ", Google Ads" : ""}`,
  }));

export default function SubscribePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    applicantName: "",
    email: "",
    phone: "",
    propertyName: "",
    propertyAddress: "",
    totalUnits: 1,
    requestedPlan: "basic",
    requestedMonths: 1,
  });
  const [monthMode, setMonthMode] = useState("preset");
  const [success, setSuccess] = useState(false);
  const { data: planCatalog } = useQuery({
    queryKey: ["public", "plans"],
    queryFn: () => request({ url: "/public/plans" }),
  });
  const plans = planList(planCatalog).length ? planList(planCatalog) : FALLBACK_PLANS;
  const selectedPlan = plans.find((plan) => plan.value === form.requestedPlan) || plans[0];
  const totalPlanAmount = Number(selectedPlan?.price || 0) * Number(form.requestedMonths || 1);

  const subscribeMutation = useMutation({
    mutationFn: async (payload) => api.post("/public/subscribe", payload),
    onSuccess: () => setSuccess(true),
    onError: (err) => {
      toast.error(err.response?.data?.message || "আবেদন ব্যর্থ হয়েছে");
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.applicantName || !form.phone)
      return toast.error("নাম ও ফোন নম্বর দিন");

    subscribeMutation.mutate(form);
  };

  if (success)
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">আবেদন সফল!</h2>
          <p className="text-gray-500 mb-6">
            অ্যাডমিন শীঘ্রই আপনার আবেদন পর্যালোচনা করবেন। অনুমোদিত হলে এই{" "}
            {form.phone} নম্বরে লগইন তথ্য পাঠানো হবে।
          </p>
          <button
            onClick={() => router.push("/login")}
            className="w-full bg-green-600 text-white py-3 rounded-xl font-medium"
          >
            লগইন পেজে যান
          </button>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-sm mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-500 mb-6 mt-4"
        >
          <ArrowLeft size={20} /> ফিরে যান
        </button>

        <div className="bg-white rounded-2xl shadow p-6">
          <h1 className="text-xl font-bold text-gray-900 mb-1">
            সাবস্ক্রিপশন আবেদন
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            ফর্মটি পূরণ করুন। অ্যাডমিন অনুমোদন করলে ইমেইলে লগইন তথ্য পাবেন।
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              {
                label: "আপনার নাম *",
                key: "applicantName",
                type: "text",
                ph: "পূর্ণ নাম লিখুন",
              },
              {
                label: "ইমেইল ",
                key: "email",
                type: "email",
                ph: "আপনার ইমেইল",
              },
              {
                label: "ফোন নম্বর *",
                key: "phone",
                type: "tel",
                ph: "01XXXXXXXXX",
              },
              {
                label: "বাড়ির নাম",
                key: "propertyName",
                type: "text",
                ph: "যেমন: রহমান ভিলা",
              },
              {
                label: "ঠিকানা",
                key: "propertyAddress",
                type: "text",
                ph: "বাড়ির ঠিকানা",
              },
            ].map(({ label, key, type, ph }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {label}
                </label>
                <input
                  type={type}
                  placeholder={ph}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                মোট ফ্ল্যাট/রুম সংখ্যা
              </label>
              <input
                type="number"
                min="1"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                value={form.totalUnits}
                onChange={(e) =>
                  setForm({ ...form, totalUnits: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                প্ল্যান নির্বাচন করুন
              </label>
              <div className="space-y-2">
                {plans.map((plan) => (
                  <label
                    key={plan.value}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 has-[:checked]:border-green-600 has-[:checked]:bg-green-50"
                  >
                    <input
                      type="radio"
                      name="requestedPlan"
                      value={plan.value}
                      checked={form.requestedPlan === plan.value}
                      onChange={(e) =>
                        setForm({ ...form, requestedPlan: e.target.value })
                      }
                      className="mt-1 accent-green-600"
                    />
                    <span>
                      <span className="block text-sm font-bold text-gray-900">
                        {plan.name} · ৳{plan.price.toLocaleString("bn-BD")}/মাস
                      </span>
                      <span className="block text-xs leading-5 text-gray-500">
                        {plan.desc}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    কত মাসের জন্য আবেদন করবেন
                  </label>
                  <p className="mt-1 text-xs text-gray-500">
                    ১, ৩, ৬, ১২, ২৪ মাস অথবা নিজের মতো কাস্টম মাস বেছে নিন
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setMonthMode((current) =>
                      current === "preset" ? "custom" : "preset",
                    )
                  }
                  className="rounded-full border border-green-200 px-3 py-1 text-xs font-medium text-green-700"
                >
                  {monthMode === "preset" ? "কাস্টম মাস" : "প্রিসেট অপশন"}
                </button>
              </div>

              {monthMode === "preset" ? (
                <div className="grid grid-cols-3 gap-2">
                  {MONTH_OPTIONS.map((month) => (
                    <button
                      key={month}
                      type="button"
                      onClick={() => setForm({ ...form, requestedMonths: month })}
                      className={`rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${
                        Number(form.requestedMonths) === month
                          ? "border-green-600 bg-green-600 text-white"
                          : "border-gray-200 bg-white text-gray-700"
                      }`}
                    >
                      {month} মাস
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  type="number"
                  min="1"
                  placeholder="যেমন 9"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                  value={form.requestedMonths}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      requestedMonths: Math.max(1, Number(e.target.value || 1)),
                    })
                  }
                />
              )}

              <div className="rounded-xl bg-white px-4 py-3 text-sm text-gray-700">
                <p>
                  <strong>মাসিক মূল্য:</strong> ৳
                  {Number(selectedPlan?.price || 0).toLocaleString("bn-BD")}
                </p>
                <p>
                  <strong>মোট আনুমানিক মূল্য:</strong> ৳
                  {totalPlanAmount.toLocaleString("bn-BD")}
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={subscribeMutation.isPending}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold py-3 rounded-xl text-base transition-colors"
            >
              {subscribeMutation.isPending ? "জমা হচ্ছে..." : "আবেদন জমা দিন"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
