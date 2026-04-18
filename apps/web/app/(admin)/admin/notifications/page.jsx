"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bell, Send } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { request } from "@/lib/query";

export default function AdminNotificationsPage() {
  const [form, setForm] = useState({
    landlordId: "",
    title: "",
    body: "",
    channel: "in_app",
  });

  const { data: landlords = [] } = useQuery({
    queryKey: ["admin", "landlords", "notice-form"],
    queryFn: () => request({ url: "/admin/landlords" }),
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["admin", "notifications"],
    queryFn: () => request({ url: "/notifications" }),
  });

  const sendMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/admin/notices/landlords", payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      setForm({ landlordId: "", title: "", body: "", channel: "in_app" });
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "নোটিফিকেশন পাঠানো যায়নি"),
  });

  const submit = (e) => {
    e.preventDefault();
    if (!form.title || !form.body) return toast.error("শিরোনাম ও বার্তা দিন");
    sendMutation.mutate(form);
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-700 text-white">
            <Send size={19} />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-950">বাড়ীওয়ালাকে নোটিফিকেশন</h1>
            <p className="text-sm text-gray-500">একজন বা সকল বাড়ীওয়ালাকে পাঠান</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-bold text-gray-700">প্রাপক</label>
            <select
              value={form.landlordId}
              onChange={(e) => setForm((f) => ({ ...f, landlordId: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-3"
            >
              <option value="">সকল বাড়ীওয়ালা</option>
              {landlords.map((landlord) => (
                <option key={landlord._id} value={landlord._id}>
                  {landlord.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-gray-700">মাধ্যম</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                ["in_app", "অ্যাপ"],
                ["email", "ইমেইল"],
                ["sms", "SMS"],
              ].map(([value, label]) => (
                <label
                  key={value}
                  className="cursor-pointer rounded-lg border border-gray-200 p-3 text-center text-sm font-semibold has-[:checked]:border-emerald-700 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-800"
                >
                  <input
                    type="radio"
                    name="channel"
                    value={value}
                    checked={form.channel === value}
                    onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}
                    className="sr-only"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="শিরোনাম"
            className="w-full rounded-lg border border-gray-200 px-3 py-3"
          />
          <textarea
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            rows={5}
            placeholder="বার্তা লিখুন"
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-3"
          />
          <button
            disabled={sendMutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            <Send size={17} />
            {sendMutation.isPending ? "পাঠানো হচ্ছে..." : "পাঠান"}
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Bell size={19} className="text-emerald-700" />
          <h2 className="text-lg font-black text-gray-950">সকল নোটিফিকেশন</h2>
        </div>
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div key={notification._id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-gray-900">{notification.title}</p>
                  <p className="mt-1 text-sm leading-6 text-gray-600">{notification.body}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-500">
                  {notification.channel}
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-400">
                {notification.userId?.name || "ব্যবহারকারী"} · {new Date(notification.createdAt).toLocaleString("bn-BD")}
              </p>
            </div>
          ))}
          {!notifications.length && (
            <p className="py-10 text-center text-sm text-gray-400">কোনো নোটিফিকেশন নেই</p>
          )}
        </div>
      </div>
    </div>
  );
}
