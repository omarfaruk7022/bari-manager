"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Edit3, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { request } from "@/lib/query";

export default function AdminLandlordsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [toggling, setToggling] = useState(null);
  const { data: landlords = [], isLoading: loading } = useQuery({
    queryKey: ["admin", "landlords"],
    queryFn: () => request({ url: "/admin/landlords" }),
  });
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

  return (
    <div className="py-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">সকল ল্যান্ডলর্ড</h1>

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
          <p>কোনো ল্যান্ডলর্ড নেই</p>
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
                      },
                    });
                  }}
                  className="grid gap-3 border-t border-gray-100 pt-4 md:grid-cols-2"
                >
                  <input
                    name="name"
                    defaultValue={l.name}
                    className="rounded-lg border border-gray-200 px-3 py-2"
                  />
                  <input
                    name="email"
                    defaultValue={l.email}
                    className="rounded-lg border border-gray-200 px-3 py-2"
                  />
                  <input
                    name="phone"
                    defaultValue={l.phone}
                    className="rounded-lg border border-gray-200 px-3 py-2"
                  />
                  <input
                    name="propertyName"
                    defaultValue={l.profile?.propertyName}
                    className="rounded-lg border border-gray-200 px-3 py-2"
                  />
                  <input
                    name="propertyAddress"
                    defaultValue={l.profile?.propertyAddress}
                    className="rounded-lg border border-gray-200 px-3 py-2 md:col-span-2"
                  />
                  <input
                    name="totalUnits"
                    type="number"
                    defaultValue={l.profile?.totalUnits || 0}
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
                <div className="flex gap-2 border-t border-gray-100 pt-4">
                  <button
                    onClick={() => setEditing(l._id)}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
                  >
                    <Edit3 size={16} /> সম্পাদনা
                  </button>
                  <button
                    onClick={() => {
                      if (!confirm("এই ল্যান্ডলর্ড ও সম্পর্কিত তথ্য মুছবেন?"))
                        return;
                      deleteMutation.mutate(l._id);
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
