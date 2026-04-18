"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, Eye, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { request } from "@/lib/query";

export default function AdminTenantsPage() {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const now = new Date();
  const [billMonth, setBillMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
  );
  const queryClient = useQueryClient();
  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["admin", "tenants", search],
    queryFn: () =>
      request({
        url: `/admin/tenants${search ? `?search=${encodeURIComponent(search)}` : ""}`,
      }),
  });
  const { data: tenantDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ["admin", "tenant", selected, billMonth],
    queryFn: () => request({ url: `/admin/tenants/${selected}?month=${billMonth}` }),
    enabled: !!selected,
  });
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "tenants"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] }),
    ]);
  const toggleMutation = useMutation({
    mutationFn: (id) => api.put(`/admin/tenants/${id}/toggle`),
    onSuccess: async (res) => {
      toast.success(res.data.message);
      await refresh();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "পরিবর্তন করা যায়নি"),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/admin/tenants/${id}`, payload),
    onSuccess: async () => {
      toast.success("ভাড়াটে আপডেট হয়েছে");
      setEditing(null);
      await refresh();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "আপডেট করা যায়নি"),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/tenants/${id}`),
    onSuccess: async () => {
      toast.success("ভাড়াটে মুছে ফেলা হয়েছে");
      await refresh();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "মুছতে পারেনি"),
  });
  const generateBillMutation = useMutation({
    mutationFn: async ({ id, month }) => {
      const [year] = month.split("-");
      const res = await api.post(`/admin/tenants/${id}/generate-bill`, {
        month,
        year: Number(year),
      });
      return res.data;
    },
    onSuccess: async (res) => {
      toast.success(res.message);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "tenant", selected, billMonth] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "tenants"] }),
      ]);
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "বিল তৈরি করা যায়নি"),
  });

  return (
    <div className="space-y-4 py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">সকল ভাড়াটে</h1>
          <p className="text-sm text-gray-500">
            এখান থেকে সম্পাদনা, নিষ্ক্রিয়, আর মুছে ফেলা যাবে।
          </p>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="নাম দিয়ে খুঁজুন"
          className="w-full max-w-xs rounded-lg border border-gray-200 px-3 py-2"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-2xl bg-gray-100"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {tenants.map((tenant) => (
            <div
              key={tenant._id}
              className="rounded-2xl bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-gray-900">{tenant.name}</p>
                  <p className="text-sm text-gray-500">
                    {tenant.userId?.email || tenant.email || "ইমেইল নেই"}
                  </p>
                  <p className="text-sm text-gray-500">{tenant.phone}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    বাড়ীওয়ালা: {tenant.landlordId?.name || "অজানা"} • ইউনিট:{" "}
                    {tenant.propertyId?.unitNumber || "—"}
                  </p>
                </div>
                <button
                  onClick={() => toggleMutation.mutate(tenant._id)}
                  className="text-gray-400"
                >
                  {tenant.isActive ? (
                    <ToggleRight size={28} className="text-green-600" />
                  ) : (
                    <ToggleLeft size={28} />
                  )}
                </button>
              </div>

              {editing === tenant._id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    updateMutation.mutate({
                      id: tenant._id,
                      payload: {
                        name: formData.get("name"),
                        phone: formData.get("phone"),
                        email: formData.get("email"),
                        monthlyRent: Number(formData.get("monthlyRent") || 0),
                        advanceAmount: Number(
                          formData.get("advanceAmount") || 0,
                        ),
                      },
                    });
                  }}
                  className="mt-4 grid gap-3 border-t border-gray-100 pt-4 md:grid-cols-2"
                >
                  <input
                    name="name"
                    defaultValue={tenant.name}
                    className="rounded-lg border border-gray-200 px-3 py-2"
                  />
                  <input
                    name="phone"
                    defaultValue={tenant.phone}
                    className="rounded-lg border border-gray-200 px-3 py-2"
                  />
                  <input
                    name="email"
                    defaultValue={tenant.email}
                    className="rounded-lg border border-gray-200 px-3 py-2"
                  />
                  <input
                    name="monthlyRent"
                    type="number"
                    defaultValue={tenant.monthlyRent}
                    className="rounded-lg border border-gray-200 px-3 py-2"
                  />
                  <input
                    name="advanceAmount"
                    type="number"
                    defaultValue={tenant.advanceAmount || 0}
                    className="rounded-lg border border-gray-200 px-3 py-2"
                  />
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
                <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4">
                  <button
                    onClick={() => setSelected(tenant._id)}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
                  >
                    <Eye size={16} /> দেখুন
                  </button>
                  <button
                    onClick={() => setEditing(tenant._id)}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
                  >
                    <Edit3 size={16} /> সম্পাদনা
                  </button>
                  <button
                    onClick={() => {
                      if (!confirm("এই ভাড়াটে মুছবেন?")) return;
                      deleteMutation.mutate(tenant._id);
                    }}
                    className="flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600"
                  >
                    <Trash2 size={16} /> মুছুন
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <p className="text-lg font-bold text-gray-900">ভাড়াটের তথ্য</p>
                <p className="text-xs text-gray-500">সংশ্লিষ্ট বাড়ীওয়ালা, ইউনিট, বিল ও পেমেন্ট</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600"
              >
                বন্ধ
              </button>
            </div>

            {detailsLoading ? (
              <div className="p-8 text-center text-sm text-gray-500">লোড হচ্ছে...</div>
            ) : (
              <div className="space-y-4 p-5">
                <div>
                  <p className="text-2xl font-black text-gray-950">{tenantDetails?.name}</p>
                  <p className="mt-1 text-sm text-gray-500">{tenantDetails?.phone} · {tenantDetails?.email || "ইমেইল নেই"}</p>
                </div>

                <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-emerald-900">
                        বিলের মাস
                      </label>
                      <input
                        type="month"
                        value={billMonth}
                        onChange={(e) => setBillMonth(e.target.value)}
                        className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900"
                      />
                    </div>
                    {tenantDetails?.selectedMonthBill ? (
                      <div className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-emerald-800">
                        {tenantDetails.selectedMonth} মাসের বিল আছে · ৳
                        {tenantDetails.selectedMonthBill.totalAmount?.toLocaleString()}
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          generateBillMutation.mutate({
                            id: tenantDetails?._id,
                            month: billMonth,
                          })
                        }
                        disabled={generateBillMutation.isPending || !tenantDetails?._id}
                        className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                      >
                        {generateBillMutation.isPending
                          ? "বিল তৈরি হচ্ছে..."
                          : "এই মাসের বিল তৈরি করুন"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Info label="বাড়ীওয়ালা" value={tenantDetails?.landlordId?.name || "—"} />
                  <Info label="ইউনিট" value={`${tenantDetails?.propertyId?.unitNumber || "—"} ${tenantDetails?.propertyId?.floor ? `· ${tenantDetails.propertyId.floor}` : ""}`} />
                  <Info label="মাসিক ভাড়া" value={`৳${Number(tenantDetails?.monthlyRent || 0).toLocaleString()}`} />
                  <Info label="অগ্রিম" value={`৳${Number(tenantDetails?.advanceAmount || 0).toLocaleString()}`} />
                  <Info label="মোট বিল" value={`${tenantDetails?.billSummary?.bills || 0}টি`} />
                  <Info label="বকেয়া" value={`৳${Number(tenantDetails?.billSummary?.totalDue || 0).toLocaleString()}`} />
                  <Info label="লগইন" value={tenantDetails?.userId?.lastLoginAt ? new Date(tenantDetails.userId.lastLoginAt).toLocaleDateString("bn-BD") : "এখনও নয়"} />
                  <Info label="স্ট্যাটাস" value={tenantDetails?.isActive ? "সক্রিয়" : "নিষ্ক্রিয়"} />
                </div>

                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="mb-2 text-sm font-bold text-gray-800">সাম্প্রতিক পেমেন্ট</p>
                  {tenantDetails?.recentPayments?.length ? (
                    <div className="space-y-2">
                      {tenantDetails.recentPayments.map((payment) => (
                        <div key={payment._id} className="flex justify-between text-sm text-gray-600">
                          <span>{new Date(payment.createdAt).toLocaleDateString("bn-BD")}</span>
                          <span className="font-bold">৳{payment.amount?.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">কোনো পেমেন্ট নেই</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-gray-900">{value}</p>
    </div>
  );
}
