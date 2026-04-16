"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Eye, EyeOff, Lock, Save } from "lucide-react";
import api from "@/lib/api";

export default function TenantSettingsPage() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [show, setShow] = useState({});

  const mutation = useMutation({
    mutationFn: (payload) => api.put("/auth/change-password", payload),
    onSuccess: () => {
      toast.success("পাসওয়ার্ড পরিবর্তন হয়েছে");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (err) => toast.error(err.response?.data?.message || "সমস্যা হয়েছে"),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.currentPassword || !form.newPassword) return toast.error("সব ঘর পূরণ করুন");
    if (form.newPassword !== form.confirmPassword) return toast.error("নতুন পাসওয়ার্ড মিলছে না");
    if (form.newPassword.length < 6) return toast.error("পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে");
    mutation.mutate({ currentPassword: form.currentPassword, newPassword: form.newPassword });
  };

  return (
    <div className="py-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">সেটিংস</h1>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Lock size={18} className="text-green-600" />
          <h2 className="font-semibold text-gray-900">পাসওয়ার্ড পরিবর্তন</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {[
            { key: "currentPassword", label: "বর্তমান পাসওয়ার্ড" },
            { key: "newPassword", label: "নতুন পাসওয়ার্ড" },
            { key: "confirmPassword", label: "নতুন পাসওয়ার্ড নিশ্চিত করুন" },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <div className="relative">
                <input
                  type={show[key] ? "text" : "password"}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-green-500"
                  value={form[key]}
                  onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                />
                <button type="button" onClick={() => setShow(s => ({ ...s, [key]: !s[key] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {show[key] ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          ))}
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-xl font-medium disabled:bg-green-300"
          >
            <Save size={16} />
            {mutation.isPending ? "পরিবর্তন হচ্ছে..." : "পাসওয়ার্ড পরিবর্তন করুন"}
          </button>
        </form>
      </div>
    </div>
  );
}
