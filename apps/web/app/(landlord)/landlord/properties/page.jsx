"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Edit3, Plus, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { request } from "@/lib/query";

const emptyForm = {
  propertyName: "",
  propertyAddress: "",
  unitNumber: "",
  floor: "",
  type: "flat",
  monthlyRent: "",
  description: "",
};

const emptyPropertyForm = {
  propertyName: "",
  propertyAddress: "",
  description: "",
};

const typeLabels = {
  flat: "ফ্ল্যাট",
  room: "রুম",
  shop: "দোকান",
  office: "অফিস",
};

const fieldClass =
  "w-full rounded-xl border border-gray-200 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500";

export default function LandlordPropertiesPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [propertyForm, setPropertyForm] = useState(emptyPropertyForm);
  const [editingId, setEditingId] = useState(null);
  const [activeForm, setActiveForm] = useState(null);

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["landlord", "properties", "all"],
    queryFn: () => request({ url: "/landlord/properties" }),
  });

  const propertyGroups = useMemo(() => {
    const groups = new Map();
    properties.forEach((property) => {
      const key = property.propertyName || "নামহীন প্রপার্টি";
      if (!groups.has(key)) {
        groups.set(key, {
          name: key,
          address: property.propertyAddress || "",
          units: [],
          occupied: 0,
        });
      }
      const group = groups.get(key);
      if (property.isUnit !== false) {
        group.units.push(property);
        group.occupied += property.isOccupied ? 1 : 0;
      }
    });

    return Array.from(groups.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [properties]);

  const resetForm = () => {
    setForm(emptyForm);
    setPropertyForm(emptyPropertyForm);
    setEditingId(null);
    setActiveForm(null);
  };

  const propertyOptions = propertyGroups.map((group) => ({
    name: group.name,
    address: group.address,
  }));

  const groupMutation = useMutation({
    mutationFn: (payload) => api.post("/landlord/properties/groups", payload),
    onSuccess: () => {
      toast.success("প্রপার্টি যুক্ত হয়েছে");
      queryClient.invalidateQueries({ queryKey: ["landlord", "properties"] });
      resetForm();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "প্রপার্টি যুক্ত করা যায়নি"),
  });

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editingId
        ? api.put(`/landlord/properties/${editingId}`, payload)
        : api.post("/landlord/properties", payload),
    onSuccess: () => {
      toast.success(editingId ? "ইউনিট আপডেট হয়েছে" : "ইউনিট যুক্ত হয়েছে");
      queryClient.invalidateQueries({ queryKey: ["landlord", "properties"] });
      resetForm();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "ইউনিট সংরক্ষণ করা যায়নি"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/landlord/properties/${id}`),
    onSuccess: () => {
      toast.success("ইউনিট মুছে গেছে");
      queryClient.invalidateQueries({ queryKey: ["landlord", "properties"] });
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "ইউনিট মুছতে সমস্যা হয়েছে"),
  });

  const startEdit = (property) => {
    setForm({
      propertyName: property.propertyName || "",
      propertyAddress: property.propertyAddress || "",
      unitNumber: property.unitNumber || "",
      floor: property.floor || "",
      type: property.type || "flat",
      monthlyRent: property.monthlyRent || "",
      description: property.description || "",
    });
    setEditingId(property._id);
    setActiveForm("unit");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.propertyName || !form.unitNumber || !form.monthlyRent) {
      return toast.error("প্রপার্টির নাম, ইউনিট নম্বর ও ভাড়া দিন");
    }
    saveMutation.mutate(form);
  };

  const handlePropertySubmit = (e) => {
    e.preventDefault();
    if (!propertyForm.propertyName) return toast.error("প্রপার্টির নাম দিন");
    groupMutation.mutate(propertyForm);
  };

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">প্রপার্টি</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setPropertyForm(emptyPropertyForm);
              setEditingId(null);
              setActiveForm("property");
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-green-600 px-3 py-2.5 text-sm font-semibold text-green-700"
          >
            <Plus size={18} /> প্রপার্টি
          </button>
          <button
            type="button"
            onClick={() => {
              setForm(emptyForm);
              setEditingId(null);
              setActiveForm("unit");
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-3 py-2.5 text-sm font-semibold text-white"
          >
            <Plus size={18} /> ইউনিট
          </button>
        </div>
      </div>

      {activeForm === "property" && (
        <form
          onSubmit={handlePropertySubmit}
          className="space-y-3 rounded-2xl border border-green-100 bg-white p-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">নতুন প্রপার্টি</h2>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
            >
              <X size={18} />
            </button>
          </div>
          <input
            placeholder="প্রপার্টি / বিল্ডিং নাম *"
            className={fieldClass}
            value={propertyForm.propertyName}
            onChange={(e) =>
              setPropertyForm((f) => ({ ...f, propertyName: e.target.value }))
            }
          />
          <input
            placeholder="প্রপার্টির ঠিকানা"
            className={fieldClass}
            value={propertyForm.propertyAddress}
            onChange={(e) =>
              setPropertyForm((f) => ({ ...f, propertyAddress: e.target.value }))
            }
          />
          <textarea
            placeholder="নোট / বিবরণ"
            className={`${fieldClass} min-h-20`}
            value={propertyForm.description}
            onChange={(e) =>
              setPropertyForm((f) => ({ ...f, description: e.target.value }))
            }
          />
          <button
            type="submit"
            disabled={groupMutation.isPending}
            className="w-full rounded-xl bg-green-600 py-3 font-semibold text-white disabled:bg-green-300"
          >
            {groupMutation.isPending ? "সংরক্ষণ হচ্ছে..." : "প্রপার্টি যুক্ত করুন"}
          </button>
        </form>
      )}

      {activeForm === "unit" && (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-2xl border border-green-100 bg-white p-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">
              {editingId ? "ইউনিট এডিট করুন" : "নতুন ইউনিট যুক্ত করুন"}
            </h2>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <select
              className={`${fieldClass} bg-white`}
              value={form.propertyName}
              onChange={(e) => {
                const selected = propertyOptions.find((item) => item.name === e.target.value);
                setForm((f) => ({
                  ...f,
                  propertyName: e.target.value,
                  propertyAddress: selected?.address || f.propertyAddress,
                }));
              }}
            >
              <option value="">প্রপার্টি বেছে নিন *</option>
              {propertyOptions.map((property) => (
                <option key={property.name} value={property.name}>
                  {property.name}
                </option>
              ))}
            </select>
            <input
              placeholder="প্রপার্টির ঠিকানা"
              className={fieldClass}
              value={form.propertyAddress}
              onChange={(e) =>
                setForm((f) => ({ ...f, propertyAddress: e.target.value }))
              }
            />
            <input
              placeholder="ইউনিট নম্বর *"
              className={fieldClass}
              value={form.unitNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, unitNumber: e.target.value }))
              }
            />
            <input
              placeholder="তলা"
              className={fieldClass}
              value={form.floor}
              onChange={(e) => setForm((f) => ({ ...f, floor: e.target.value }))}
            />
            <select
              className={`${fieldClass} bg-white`}
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              <option value="flat">ফ্ল্যাট</option>
              <option value="room">রুম</option>
              <option value="shop">দোকান</option>
              <option value="office">অফিস</option>
            </select>
            <input
              type="number"
              placeholder="মাসিক ভাড়া *"
              className={fieldClass}
              value={form.monthlyRent}
              onChange={(e) =>
                setForm((f) => ({ ...f, monthlyRent: e.target.value }))
              }
            />
          </div>
          <textarea
            placeholder="নোট / বিবরণ"
            className={`${fieldClass} min-h-24`}
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
          />
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="w-full rounded-xl bg-green-600 py-3 font-semibold text-white disabled:bg-green-300"
          >
            {saveMutation.isPending
              ? "সংরক্ষণ হচ্ছে..."
              : editingId
                ? "আপডেট করুন"
                : "ইউনিট যুক্ত করুন"}
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-20 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : propertyGroups.length === 0 ? (
        <div className="rounded-2xl bg-white py-14 text-center text-gray-400 shadow-sm">
          <Building2 className="mx-auto mb-3" size={34} />
          <p className="font-medium">এখনো কোনো প্রপার্টি নেই</p>
          <p className="mt-1 text-sm">প্রথম ইউনিট যুক্ত করুন</p>
        </div>
      ) : (
        <div className="space-y-3">
          {propertyGroups.map((group) => (
            <section key={group.name} className="overflow-hidden rounded-xl bg-white shadow-sm">
              <div className="border-b border-gray-100 px-4 py-3">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">{group.name}</h2>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {group.address || "ঠিকানা দেওয়া নেই"} · {group.occupied}/
                    {group.units.length} ইউনিট দখলকৃত
                  </p>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {group.units.map((property) => (
                  <div
                    key={property._id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate font-semibold text-gray-900">
                          {property.unitNumber}
                        </p>
                      <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          property.isOccupied
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {property.isOccupied ? "দখলকৃত" : "খালি"}
                      </span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {typeLabels[property.type] || property.type}
                        {property.floor ? ` · ${property.floor} তলা` : ""} ·{" "}
                        ৳{Number(property.monthlyRent || 0).toLocaleString("bn-BD")}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(property)}
                          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                        >
                          <Edit3 size={17} />
                        </button>
                        <button
                          type="button"
                          disabled={property.isOccupied || deleteMutation.isPending}
                          onClick={() => deleteMutation.mutate(property._id)}
                          className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-gray-300"
                        >
                          <Trash2 size={17} />
                        </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
