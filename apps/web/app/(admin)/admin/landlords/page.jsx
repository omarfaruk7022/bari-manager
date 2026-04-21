"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Edit3, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { request } from "@/lib/query";

const PLAN_OPTIONS = [
  { value: "basic", label: "Basic", price: 499 },
  { value: "standard", label: "Standard", price: 999 },
  { value: "premium", label: "Premium", price: 1999 },
  { value: "enterprise", label: "Enterprise", price: 4999 },
];

const toPlanOptions = (plans) =>
  Object.entries(plans || {}).map(([value, plan]) => ({
    value,
    label: plan.name,
    price: plan.price,
  }));

export default function AdminLandlordsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [toggling, setToggling] = useState(null);
  const [smsTopUp, setSmsTopUp] = useState(null);
  const [passwordModal, setPasswordModal] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const { data: landlords = [], isLoading: loading } = useQuery({
    queryKey: ["admin", "landlords"],
    queryFn: () => request({ url: "/admin/landlords" }),
  });
  const { data: planCatalog } = useQuery({
    queryKey: ["admin", "plans"],
    queryFn: () => request({ url: "/admin/plans" }),
  });
  const planOptions = toPlanOptions(planCatalog).length
    ? toPlanOptions(planCatalog)
    : PLAN_OPTIONS;
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "landlords"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] }),
    ]);
  const toggleMutation = useMutation({
    mutationFn: (id) => api.put(`/admin/landlords/${id}/toggle`),
    onSuccess: async (res) => {
      toast.success(res.data.message);
      await refresh();
    },
    onError: () => toast.error("পরিবর্তন করা যায়নি"),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/admin/landlords/${id}`, payload),
    onSuccess: async () => {
      toast.success("আপডেট হয়েছে");
      setEditing(null);
      await refresh();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "আপডেট করা যায়নি"),
  });
  const passwordMutation = useMutation({
    mutationFn: ({ userId, newPassword }) =>
      api.post("/auth/admin-reset-password", { userId, newPassword }),
    onSuccess: (res) => {
      toast.success(res.data.message);
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "পাসওয়ার্ড পরিবর্তন করা যায়নি"),
  });
  const extendSmsMutation = useMutation({
    mutationFn: ({ id, addLimit }) => api.post(`/admin/landlords/${id}/extend-sms`, { addLimit }),
    onSuccess: async () => {
      toast.success("SMS লিমিট সফলভাবে বাড়ানো হয়েছে");
      setSmsTopUp(null);
      await refresh();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "SMS লিমিট বাড়াতে সমস্যা হয়েছে"),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/landlords/${id}`),
    onSuccess: async () => {
      toast.success("মুছে ফেলা হয়েছে");
      await refresh();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "মুছতে পারেনি"),
  });

  const toggle = async (id) => {
    setToggling(id);
    toggleMutation.mutate(id, { onSettled: () => setToggling(null) });
  };

  const openPasswordModal = (target) => {
    setPasswordModal(target);
    setNewPassword("");
  };

  const closePasswordModal = () => {
    setPasswordModal(null);
    setNewPassword("");
  };

  const submitPasswordChange = (e) => {
    e.preventDefault();
    if (!passwordModal?.userId) return;
    if (!newPassword.trim()) {
      toast.error("নতুন পাসওয়ার্ড লিখুন");
      return;
    }
    passwordMutation.mutate(
      { userId: passwordModal.userId, newPassword: newPassword.trim() },
      { onSuccess: () => closePasswordModal() },
    );
  };

  return (
    <div className="py-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">সকল বাড়ীওয়ালা</h1>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 bg-gray-100 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : landlords.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>কোনো বাড়ীওয়ালা নেই</p>
        </div>
      ) : (
        <div className="space-y-3">
          {landlords.map((l) => (
            <div
              key={l._id}
              className="bg-white rounded-2xl p-4 shadow-sm space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-gray-900">{l.name}</p>
                  <p className="text-sm text-gray-500">{l.email}</p>
                  {l.phone && (
                    <p className="text-sm text-gray-500">{l.phone}</p>
                  )}
                  {l.profile?.propertyName && (
                    <p className="text-sm text-gray-500">
                      {l.profile.propertyName}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    বসবাসরত ভাড়াটিয়া : {l.activeTenants || 0}
                  </p>
                  <p className="text-xs text-blue-600 mt-1 font-medium">
                    SMS লিমিট: {l.profile?.smsUsed || 0}/{l.profile?.smsLimit || 0}
                  </p>
                  <p className="text-xs text-emerald-700 mt-1 font-medium">
                    প্ল্যান: {planOptions.find((p) => p.value === l.profile?.plan)?.label || "Basic"} · ৳{(planOptions.find((p) => p.value === l.profile?.plan)?.price || 499).toLocaleString("bn-BD")}/মাস · ফ্ল্যাট {l.unitCount || 0}/{l.profile?.flatLimit || 5} · রিপোর্ট {l.profile?.reportMonths || 1} মাস
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    যোগদান: {new Date(l.createdAt).toLocaleDateString("bn-BD")}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${l.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                  >
                    {l.isActive ? "সক্রিয়" : "নিষ্ক্রিয়"}
                  </span>
                  <button
                    onClick={() => toggle(l._id)}
                    disabled={toggling === l._id}
                    className="text-gray-400 disabled:opacity-50"
                  >
                    {l.isActive ? (
                      <ToggleRight size={28} className="text-green-600" />
                    ) : (
                      <ToggleLeft size={28} />
                    )}
                  </button>
                </div>
              </div>

              {editing === l._id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    updateMutation.mutate({
                      id: l._id,
                      payload: {
                        name: formData.get("name"),
                        email: formData.get("email"),
                        phone: formData.get("phone"),
                        propertyName: formData.get("propertyName"),
                        propertyAddress: formData.get("propertyAddress"),
                        totalUnits: Number(formData.get("totalUnits") || 0),
                        plan: formData.get("plan"),
                      },
                    });
                  }}
                  className="grid gap-3 border-t border-gray-100 pt-4 md:grid-cols-2"
                >
                  <FormField label="বাড়ীওয়ালার নাম">
                    <input
                      name="name"
                      defaultValue={l.name}
                      className="rounded-lg border border-gray-200 px-3 py-2"
                    />
                  </FormField>
                  <FormField label="ইমেইল">
                    <input
                      name="email"
                      defaultValue={l.email}
                      className="rounded-lg border border-gray-200 px-3 py-2"
                    />
                  </FormField>
                  <FormField label="মোবাইল নম্বর">
                    <input
                      name="phone"
                      defaultValue={l.phone}
                      className="rounded-lg border border-gray-200 px-3 py-2"
                    />
                  </FormField>
                  <FormField label="বাড়ির নাম">
                    <input
                      name="propertyName"
                      defaultValue={l.profile?.propertyName}
                      className="rounded-lg border border-gray-200 px-3 py-2"
                    />
                  </FormField>
                  <FormField label="বাড়ির ঠিকানা" className="md:col-span-2">
                    <input
                      name="propertyAddress"
                      defaultValue={l.profile?.propertyAddress}
                      className="rounded-lg border border-gray-200 px-3 py-2"
                    />
                  </FormField>
                  <FormField label="সাবস্ক্রিপশন প্ল্যান">
                    <select
                      name="plan"
                      defaultValue={l.profile?.plan || "basic"}
                      className="rounded-lg border border-gray-200 px-3 py-2"
                    >
                      {planOptions.map((plan) => (
                        <option key={plan.value} value={plan.value}>
                          {plan.label} · ৳{plan.price.toLocaleString("bn-BD")}/মাস
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="মোট ইউনিট">
                    <input
                      name="totalUnits"
                      type="number"
                      defaultValue={l.profile?.totalUnits || 0}
                      className="rounded-lg border border-gray-200 px-3 py-2"
                    />
                  </FormField>
                  <div className="flex gap-2 md:col-span-2">
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="rounded-lg border border-gray-200 px-4 py-2 text-sm"
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white"
                    >
                      সংরক্ষণ
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex gap-2 border-t border-gray-100 pt-4">
                  <button
                    onClick={() => setEditing(l._id)}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
                  >
                    <Edit3 size={16} /> সম্পাদনা
                  </button>
                  <button
                    onClick={() => {
                      openPasswordModal({
                        userId: l._id,
                        name: l.name,
                        roleLabel: "বাড়ীওয়ালা",
                      });
                    }}
                    className="flex items-center gap-2 rounded-lg border border-amber-200 px-3 py-2 text-sm text-amber-700"
                  >
                    পাসওয়ার্ড
                  </button>
                  <button
                    onClick={() => setSmsTopUp(l._id)}
                    className="flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-sm text-blue-600 bg-blue-50"
                  >
                    SMS Top Up
                  </button>
                  <button
                    onClick={() => {
                      if (!confirm("এই বাড়ীওয়ালা ও সম্পর্কিত তথ্য মুছবেন?"))
                        return;
                      deleteMutation.mutate(l._id);
                    }}
                    className="flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600"
                  >
                    <Trash2 size={16} /> মুছুন
                  </button>
                </div>
              )}

              {smsTopUp === l._id && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    extendSmsMutation.mutate({
                      id: l._id,
                      addLimit: Number(formData.get("addLimit")),
                    });
                  }}
                  className="grid gap-3 border-t border-gray-100 pt-4 md:grid-cols-2 bg-blue-50/50 -mx-4 px-4 pb-4 rounded-b-2xl"
                >
                  <input
                    name="addLimit"
                    type="number"
                    min="1"
                    placeholder="কোটা যোগ করুন (যেমন: 50)"
                    required
                    className="rounded-lg border border-blue-200 px-3 py-2"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSmsTopUp(null)}
                      className="rounded-lg border border-blue-200 px-4 py-2 text-sm text-blue-700"
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      disabled={extendSmsMutation.isPending}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      যুক্ত করুন
                    </button>
                  </div>
                </form>
              )}
            </div>
          ))}
        </div>
      )}

      {passwordModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4">
              <p className="text-lg font-bold text-gray-900">
                {passwordModal.roleLabel} পাসওয়ার্ড পরিবর্তন
              </p>
              <p className="mt-1 text-sm text-gray-500">{passwordModal.name}</p>
            </div>

            <form onSubmit={submitPasswordChange} className="space-y-4">
              <label className="grid gap-1.5 text-sm font-medium text-gray-700">
                <span>নতুন পাসওয়ার্ড</span>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-2"
                  autoFocus
                />
              </label>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closePasswordModal}
                  className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={passwordMutation.isPending}
                  className="flex-1 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {passwordMutation.isPending ? "সংরক্ষণ..." : "পাসওয়ার্ড পরিবর্তন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({ label, className = "", children }) {
  return (
    <label className={`grid gap-1.5 text-sm font-medium text-gray-700 ${className}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}
