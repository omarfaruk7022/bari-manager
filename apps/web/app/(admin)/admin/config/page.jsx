"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Eye, EyeOff, Save, RefreshCw, Shield } from "lucide-react";
import api from "@/lib/api";
import { request } from "@/lib/query";

const CATEGORY_LABELS = {
  smtp: "📧 ইমেইল (SMTP)",
  sms: "📱 SMS সেটিং",
  payment: "💳 পেমেন্ট (bKash)",
  app: "🌐 অ্যাপ URL",
  security: "🔒 নিরাপত্তা",
  other: "⚙️ অন্যান্য",
};

export default function AdminConfigPage() {
  const qc = useQueryClient();
  const [reveal, setReveal] = useState({});
  const [edited, setEdited] = useState({});

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["admin", "config"],
    queryFn: () => request({ url: "/admin/config" }),
  });

  const saveMutation = useMutation({
    mutationFn: (payload) => api.put("/admin/config/bulk", payload),
    onSuccess: () => {
      toast.success("কনফিগ সংরক্ষণ হয়েছে");
      setEdited({});
      qc.invalidateQueries({ queryKey: ["admin", "config"] });
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "সমস্যা হয়েছে"),
  });

  const handleSave = () => {
    const configs = Object.entries(edited).map(([key, value]) => ({
      key,
      value,
    }));
    if (configs.length === 0) return toast.error("কোনো পরিবর্তন নেই");
    saveMutation.mutate({ configs });
  };

  const grouped = configs.reduce((acc, c) => {
    (acc[c.category] = acc[c.category] || []).push(c);
    return acc;
  }, {});

  const getValue = (c) =>
    edited[c.key] !== undefined ? edited[c.key] : c.value;

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-green-600" />
          <h1 className="text-xl font-bold text-gray-900">সিস্টেম কনফিগ</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending || Object.keys(edited).length === 0}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium disabled:bg-green-300"
        >
          {saveMutation.isPending ? (
            <RefreshCw size={15} className="animate-spin" />
          ) : (
            <Save size={15} />
          )}
          {Object.keys(edited).length > 0
            ? `${Object.keys(edited).length}টি সংরক্ষণ`
            : "সংরক্ষণ"}
        </button>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-800">
        ⚠️ এখানের পরিবর্তন ডাটাবেজে এনক্রিপ্টেড অবস্থায় সংরক্ষণ হয় এবং সার্ভার
        রিস্টার্ট ছাড়াই কার্যকর হয়।
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : (
        Object.entries(CATEGORY_LABELS).map(([cat, catLabel]) => {
          const items = grouped[cat] || [];
          if (items.length === 0) return null;
          return (
            <div key={cat} className="bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="font-semibold text-gray-700 mb-3">{catLabel}</h2>
              <div className="space-y-3">
                {items.map((c) => (
                  <div key={c.key}>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      {c.label}{" "}
                      {c.inDb && (
                        <span className="text-green-600 ml-1">✓ DB</span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type={
                          c.isSecret && !reveal[c.key] ? "password" : "text"
                        }
                        className={`w-full border rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${edited[c.key] !== undefined ? "border-green-400 bg-green-50" : "border-gray-200"}`}
                        value={getValue(c)}
                        onChange={(e) =>
                          setEdited((ed) => ({
                            ...ed,
                            [c.key]: e.target.value,
                          }))
                        }
                        placeholder={c.key}
                      />
                      {c.isSecret && (
                        <button
                          type="button"
                          onClick={() =>
                            setReveal((r) => ({ ...r, [c.key]: !r[c.key] }))
                          }
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                        >
                          {reveal[c.key] ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {Object.keys(edited).length > 0 && (
        <div className="sticky bottom-20 bg-green-600 text-white rounded-xl p-3 flex items-center justify-between shadow-lg">
          <span className="text-sm font-medium">
            {Object.keys(edited).length}টি পরিবর্তন অসংরক্ষিত
          </span>
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="bg-white text-green-700 px-4 py-1.5 rounded-lg text-sm font-bold"
          >
            {saveMutation.isPending ? "..." : "সংরক্ষণ করুন"}
          </button>
        </div>
      )}
    </div>
  );
}
