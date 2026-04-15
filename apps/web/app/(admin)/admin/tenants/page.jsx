"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { request } from "@/lib/query";

export default function AdminTenantsPage() {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();
  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["admin", "tenants", search],
    queryFn: () =>
      request({
        url: `/admin/tenants${search ? `?search=${encodeURIComponent(search)}` : ""}`,
      }),
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
    </div>
  );
}
