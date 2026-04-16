"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowLeft, Plus, ChevronDown, ChevronUp } from "lucide-react";
import api from "@/lib/api";
import { request } from "@/lib/query";

export default function NewTenantPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "", phone: "", email: "", propertyId: "",
    moveInDate: "", monthlyRent: "", nidNumber: "",
    advanceAmount: "", notes: "",
    emergencyContact: { name: "", phone: "" },
    utilityDefaults: { gasAmount: 0, waterAmount: 0, serviceCharge: 0, garbageAmount: 0, electricityAmount: 0 },
  });

  const [showAddUnit, setShowAddUnit] = useState(false);
  const [showUtility, setShowUtility] = useState(false);
  const [newUnit, setNewUnit] = useState({ unitNumber: "", floor: "", type: "flat", monthlyRent: "" });

  const { data: properties = [], refetch: refetchProperties } = useQuery({
    queryKey: ["landlord", "properties", "all"],
    queryFn: () => request({ url: "/landlord/properties" }),
  });

  const addUnitMutation = useMutation({
    mutationFn: (payload) => api.post("/landlord/properties", payload),
    onSuccess: async (res) => {
      toast.success("ইউনিট যুক্ত হয়েছে!");
      await refetchProperties();
      qc.invalidateQueries({ queryKey: ["landlord", "properties"] });
      const created = res.data?.data;
      if (created) {
        setForm(f => ({ ...f, propertyId: created._id, monthlyRent: created.monthlyRent }));
      }
      setShowAddUnit(false);
      setNewUnit({ unitNumber: "", floor: "", type: "flat", monthlyRent: "" });
    },
    onError: (err) => toast.error(err.response?.data?.message || "ইউনিট যুক্ত করা যায়নি"),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post("/landlord/tenants", payload),
    onSuccess: () => {
      toast.success("ভাড়াটে যুক্ত হয়েছে!");
      router.push("/landlord/tenants");
    },
    onError: (err) => toast.error(err.response?.data?.message || "সমস্যা হয়েছে"),
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setU = (k, v) => setForm(f => ({ ...f, utilityDefaults: { ...f.utilityDefaults, [k]: Number(v) || 0 } }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.propertyId || !form.moveInDate || !form.monthlyRent)
      return toast.error("তারকা চিহ্নিত ঘরগুলো পূরণ করুন");
    createMutation.mutate(form);
  };

  const handleAddUnit = () => {
    if (!newUnit.unitNumber || !newUnit.monthlyRent) return toast.error("ইউনিট নম্বর ও ভাড়া দিন");
    addUnitMutation.mutate(newUnit);
  };

  const availableProps = properties.filter(p => !p.isOccupied);

  const field = (label, key, type = "text", ph = "", required = false) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type} placeholder={ph} required={required}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
        value={form[key]} onChange={(e) => set(key, e.target.value)}
      />
    </div>
  );

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl bg-gray-100"><ArrowLeft size={20} /></button>
        <h1 className="text-xl font-bold text-gray-900">নতুন ভাড়াটে</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Personal Info */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-700">ব্যক্তিগত তথ্য</h2>
          {field("নাম", "name", "text", "পূর্ণ নাম", true)}
          {field("ফোন নম্বর", "phone", "tel", "01XXXXXXXXX", true)}
          {field("ইমেইল", "email", "email", "ইমেইল (ঐচ্ছিক)")}
          {field("জাতীয় পরিচয়পত্র নম্বর", "nidNumber", "text", "NID নম্বর")}
        </div>

        {/* Unit Selection with inline add */}
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
                const p = properties.find(x => x._id === e.target.value);
                set("propertyId", e.target.value);
                if (p) set("monthlyRent", p.monthlyRent);
              }}
              required
            >
              <option value="">ইউনিট বেছে নিন</option>
              {availableProps.map(p => (
                <option key={p._id} value={p._id}>
                  {p.unitNumber}{p.floor ? ` (${p.floor} তলা)` : ""} — ৳{p.monthlyRent}
                </option>
              ))}
            </select>

            {/* Inline Add Unit toggle */}
            <button
              type="button"
              onClick={() => setShowAddUnit(v => !v)}
              className="flex items-center gap-1.5 text-sm text-green-600 font-medium mt-2"
            >
              <Plus size={15} />
              {showAddUnit ? "বাতিল করুন" : "নতুন ইউনিট যুক্ত করুন"}
            </button>

            {showAddUnit && (
              <div className="mt-3 border border-green-200 bg-green-50 rounded-xl p-3 space-y-3">
                <p className="text-sm font-medium text-green-800">নতুন ইউনিট</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder="ইউনিট নম্বর *"
                    className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={newUnit.unitNumber}
                    onChange={e => setNewUnit(u => ({ ...u, unitNumber: e.target.value }))}
                  />
                  <input
                    placeholder="তলা (ঐচ্ছিক)"
                    className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={newUnit.floor}
                    onChange={e => setNewUnit(u => ({ ...u, floor: e.target.value }))}
                  />
                  <select
                    className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={newUnit.type}
                    onChange={e => setNewUnit(u => ({ ...u, type: e.target.value }))}
                  >
                    <option value="flat">ফ্ল্যাট</option>
                    <option value="room">রুম</option>
                    <option value="shop">দোকান</option>
                    <option value="office">অফিস</option>
                  </select>
                  <input
                    type="number" placeholder="মাসিক ভাড়া *"
                    className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={newUnit.monthlyRent}
                    onChange={e => setNewUnit(u => ({ ...u, monthlyRent: e.target.value }))}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddUnit}
                  disabled={addUnitMutation.isPending}
                  className="w-full bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium disabled:bg-green-300"
                >
                  {addUnitMutation.isPending ? "যুক্ত হচ্ছে..." : "ইউনিট যুক্ত করুন"}
                </button>
              </div>
            )}
          </div>

          {field("মাসিক ভাড়া (৳)", "monthlyRent", "number", "0", true)}
          {field("অগ্রিম টাকা (৳)", "advanceAmount", "number", "0")}
          {field("ভাড়ায় আসার তারিখ", "moveInDate", "date", "", true)}
        </div>

        {/* Utility Defaults */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setShowUtility(v => !v)}
            className="w-full flex items-center justify-between p-4"
          >
            <div>
              <p className="font-semibold text-gray-700 text-left">ইউটিলিটি বিলের ডিফল্ট (ঐচ্ছিক)</p>
              <p className="text-xs text-gray-400 text-left mt-0.5">গ্যাস, পানি, সার্ভিস চার্জ ইত্যাদি</p>
            </div>
            {showUtility ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
          </button>

          {showUtility && (
            <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
              <p className="text-xs text-gray-500">এই পরিমাণগুলো স্বয়ংক্রিয় বিল তৈরিতে যুক্ত হবে। শূন্য রাখলে যুক্ত হবে না।</p>
              {[
                { key: "gasAmount", label: "গ্যাস বিল (৳)" },
                { key: "waterAmount", label: "পানির বিল (৳)" },
                { key: "serviceCharge", label: "সার্ভিস চার্জ (৳)" },
                { key: "garbageAmount", label: "ময়লার বিল (৳)" },
                { key: "electricityAmount", label: "বিদ্যুৎ (৳) — সাধারণত মিটারে হিসাব" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    type="number" min="0" placeholder="0"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={form.utilityDefaults[key] || ""}
                    onChange={e => setU(key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Emergency Contact */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-700">জরুরি যোগাযোগ (ঐচ্ছিক)</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">নাম</label>
            <input
              type="text" placeholder="জরুরি যোগাযোগের নাম"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
              value={form.emergencyContact.name}
              onChange={e => setForm(f => ({ ...f, emergencyContact: { ...f.emergencyContact, name: e.target.value } }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ফোন</label>
            <input
              type="tel" placeholder="জরুরি ফোন নম্বর"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
              value={form.emergencyContact.phone}
              onChange={e => setForm(f => ({ ...f, emergencyContact: { ...f.emergencyContact, phone: e.target.value } }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">নোট</label>
            <textarea
              rows={3} placeholder="অতিরিক্ত তথ্য..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              value={form.notes} onChange={e => set("notes", e.target.value)}
            />
          </div>
        </div>

        <button
          type="submit" disabled={createMutation.isPending}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold py-4 rounded-xl text-base"
        >
          {createMutation.isPending ? "সংরক্ষণ হচ্ছে..." : "ভাড়াটে যুক্ত করুন"}
        </button>
      </form>
    </div>
  );
}
