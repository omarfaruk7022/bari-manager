"use client";
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";
import api from "@/lib/api";
import { request } from "@/lib/query";

export default function NewTenantPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    propertyId: "",
    moveInDate: "",
    monthlyRent: "",
    nidNumber: "",
    advanceAmount: "",
    notes: "",
    emergencyContact: { name: "", phone: "" },
  });

  const { data: properties = [] } = useQuery({
    queryKey: ["landlord", "properties", "available"],
    queryFn: () => request({ url: "/landlord/properties?occupied=false" }),
  });
  const createTenantMutation = useMutation({
    mutationFn: async (payload) => api.post("/landlord/tenants", payload),
    onSuccess: () => {
      toast.success("ভাড়াটে যুক্ত হয়েছে!");
      router.push("/landlord/tenants");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "সমস্যা হয়েছে");
    },
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !form.name ||
      !form.phone ||
      !form.propertyId ||
      !form.moveInDate ||
      !form.monthlyRent
    )
      return toast.error("তারকা চিহ্নিত ঘরগুলো পূরণ করুন");
    createTenantMutation.mutate(form);
  };

  const field = (label, key, type = "text", ph = "", required = false) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        placeholder={ph}
        required={required}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
      />
    </div>
  );

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl bg-gray-100"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">নতুন ভাড়াটে</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-700">ব্যক্তিগত তথ্য</h2>
          {field("নাম", "name", "text", "পূর্ণ নাম", true)}
          {field("ফোন নম্বর", "phone", "tel", "01XXXXXXXXX", true)}
          {field("ইমেইল", "email", "email", "ইমেইল (ঐচ্ছিক)")}
          {field("জাতীয় পরিচয়পত্র নম্বর", "nidNumber", "text", "NID নম্বর")}
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-700">বাসস্থান তথ্য</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ইউনিট/ফ্ল্যাট <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              value={form.propertyId}
              onChange={(e) => {
                const p = properties.find((x) => x._id === e.target.value);
                set("propertyId", e.target.value);
                if (p) set("monthlyRent", p.monthlyRent);
              }}
              required
            >
              <option value="">ইউনিট বেছে নিন</option>
              {properties.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.unitNumber} — ৳{p.monthlyRent}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => router.push("/landlord/properties/new")}
              className="text-sm text-green-600 font-medium"
            >
              + নতুন ইউনিট
            </button>
          </div>

          {field("মাসিক ভাড়া (৳)", "monthlyRent", "number", "0", true)}
          {field("অগ্রিম টাকা (৳)", "advanceAmount", "number", "0")}
          {field("ভাড়ায় আসার তারিখ", "moveInDate", "date", "", true)}
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-700">
            জরুরি যোগাযোগ (ঐচ্ছিক)
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              নাম
            </label>
            <input
              type="text"
              placeholder="জরুরি যোগাযোগের নাম"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
              value={form.emergencyContact.name}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  emergencyContact: {
                    ...f.emergencyContact,
                    name: e.target.value,
                  },
                }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ফোন
            </label>
            <input
              type="tel"
              placeholder="জরুরি ফোন নম্বর"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
              value={form.emergencyContact.phone}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  emergencyContact: {
                    ...f.emergencyContact,
                    phone: e.target.value,
                  },
                }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              নোট
            </label>
            <textarea
              rows={3}
              placeholder="অতিরিক্ত তথ্য..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={createTenantMutation.isPending}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold py-4 rounded-xl text-base transition-colors"
        >
          {createTenantMutation.isPending ? "সংরক্ষণ হচ্ছে..." : "ভাড়াটে যুক্ত করুন"}
        </button>
      </form>
    </div>
  );
}
