"use client";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Eye, EyeOff, Lock, Save } from "lucide-react";
import api from "@/lib/api";
import { request } from "@/lib/query";

export default function LandlordSettingsPage() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [show, setShow] = useState({});

  const { data: profile } = useQuery({
    queryKey: ["landlord", "profile"],
    queryFn: () => request({ url: "/landlord/profile" }).catch(() => null),
  });
  const { data: properties = [] } = useQuery({
    queryKey: ["landlord", "properties", "all"],
    queryFn: () => request({ url: "/landlord/properties" }),
  });

  const [billDay, setBillDay] = useState(profile?.billGenerationDay || 1);
  const [dueDays, setDueDays] = useState(profile?.billDueDays || 10);
  const [autoBillPropertyName, setAutoBillPropertyName] = useState(profile?.autoBillPropertyName || "");
  const autoBillAllowed = Boolean(profile && profile.plan !== "basic");
  const propertyOptions = useMemo(() => {
    const names = new Set();
    properties.forEach((property) => {
      if (property.propertyName) names.add(property.propertyName);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [properties]);

  useEffect(() => {
    if (!profile) return;
    setBillDay(profile.billGenerationDay || 1);
    setDueDays(profile.billDueDays || 10);
    setAutoBillPropertyName(profile.autoBillPropertyName || "");
  }, [profile]);

  const passwordMutation = useMutation({
    mutationFn: (payload) => api.put("/auth/change-password", payload),
    onSuccess: () => {
      toast.success("পাসওয়ার্ড পরিবর্তন হয়েছে");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (err) => toast.error(err.response?.data?.message || "সমস্যা হয়েছে"),
  });

  const billSettingsMutation = useMutation({
    mutationFn: (payload) => api.put("/landlord/bill-settings", payload),
    onSuccess: () => toast.success("বিল সেটিং আপডেট হয়েছে"),
    onError: (err) => toast.error(err.response?.data?.message || "সমস্যা হয়েছে"),
  });

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (!form.currentPassword || !form.newPassword) return toast.error("সব ঘর পূরণ করুন");
    if (form.newPassword !== form.confirmPassword) return toast.error("নতুন পাসওয়ার্ড মিলছে না");
    if (form.newPassword.length < 6) return toast.error("পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে");
    passwordMutation.mutate({ currentPassword: form.currentPassword, newPassword: form.newPassword });
  };

  const showToggle = (k) => setShow(s => ({ ...s, [k]: !s[k] }));

  return (
    <div className="py-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">সেটিংস</h1>

      {/* Password Change */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Lock size={18} className="text-green-600" />
          <h2 className="font-semibold text-gray-900">পাসওয়ার্ড পরিবর্তন</h2>
        </div>
        <form onSubmit={handlePasswordChange} className="space-y-3">
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
                  placeholder={label}
                />
                <button type="button" onClick={() => showToggle(key)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {show[key] ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          ))}
          <button
            type="submit"
            disabled={passwordMutation.isPending}
            className="flex items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-xl font-medium disabled:bg-green-300"
          >
            <Save size={16} />
            {passwordMutation.isPending ? "পরিবর্তন হচ্ছে..." : "পাসওয়ার্ড পরিবর্তন করুন"}
          </button>
        </form>
      </div>

      {/* Auto Bill Settings */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-4">স্বয়ংক্রিয় বিল সেটিং</h2>
        {!autoBillAllowed && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
            Basic প্ল্যানে এই সেটিং ব্যবহার করা যাবে না। Standard, Premium বা Enterprise প্ল্যানে আপগ্রেড করুন।
          </div>
        )}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              বিল তৈরির তারিখ (প্রতি মাসের)
            </label>
            <select
              disabled={!autoBillAllowed}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:text-gray-400"
              value={billDay}
              onChange={(e) => setBillDay(Number(e.target.value))}
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>{d} তারিখ</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              বিল তৈরির পর কতদিনে দেয়ার শেষ সময়
            </label>
            <input
              type="number"
              min={1} max={30}
              disabled={!autoBillAllowed}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:text-gray-400"
              value={dueDays}
              onChange={(e) => setDueDays(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              অটো বিল কোন প্রপার্টির জন্য
            </label>
            <select
              disabled={!autoBillAllowed}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:text-gray-400"
              value={autoBillPropertyName}
              onChange={(e) => setAutoBillPropertyName(e.target.value)}
            >
              <option value="">সব প্রপার্টি</option>
              {propertyOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => billSettingsMutation.mutate({ billGenerationDay: billDay, billDueDays: dueDays, autoBillPropertyName })}
            disabled={billSettingsMutation.isPending || !autoBillAllowed}
            className="flex items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-xl font-medium disabled:bg-green-300"
          >
            <Save size={16} />
            {billSettingsMutation.isPending ? "সংরক্ষণ হচ্ছে..." : "সেটিং সংরক্ষণ"}
          </button>
        </div>
      </div>
    </div>
  );
}
