"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Edit3, Plus, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { request } from "@/lib/query";

const emptyPropertyForm = {
  landlordId: "",
  propertyName: "",
  propertyAddress: "",
  description: "",
};

const emptyUnitForm = {
  landlordId: "",
  propertyName: "",
  propertyAddress: "",
  unitNumber: "",
  floor: "",
  type: "flat",
  monthlyRent: "",
  description: "",
};

const fieldClass =
  "w-full rounded-xl border border-gray-200 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500";

const typeLabels = {
  flat: "ফ্ল্যাট",
  room: "রুম",
  shop: "দোকান",
  office: "অফিস",
};

export default function AdminPropertiesPage() {
  const queryClient = useQueryClient();
  const [landlordFilter, setLandlordFilter] = useState("");
  const [activeForm, setActiveForm] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [propertyForm, setPropertyForm] = useState(emptyPropertyForm);
  const [unitForm, setUnitForm] = useState(emptyUnitForm);

  const { data: landlords = [] } = useQuery({
    queryKey: ["admin", "landlords", "properties-page"],
    queryFn: () => request({ url: "/admin/landlords" }),
  });

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["admin", "properties", landlordFilter],
    queryFn: () =>
      request({
        url: `/admin/properties${landlordFilter ? `?landlordId=${landlordFilter}` : ""}`,
      }),
  });

  const landlordMap = useMemo(
    () => new Map(landlords.map((landlord) => [String(landlord._id), landlord])),
    [landlords],
  );

  const propertyGroups = useMemo(() => {
    const groups = new Map();
    properties.forEach((property) => {
      const landlordId = String(property.landlordId?._id || property.landlordId || "");
      const key = `${landlordId}:${property.propertyName || "নামহীন প্রপার্টি"}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          landlordId,
          landlordName: landlordMap.get(landlordId)?.name || "অজানা বাড়ীওয়ালা",
          name: property.propertyName || "নামহীন প্রপার্টি",
          address: property.propertyAddress || "",
          propertyRecord: property.isUnit === false ? property : null,
          units: [],
          occupied: 0,
        });
      }
      const group = groups.get(key);
      if (property.isUnit === false) {
        group.propertyRecord = property;
        group.address = property.propertyAddress || group.address;
      } else {
        group.units.push(property);
        group.occupied += property.isOccupied ? 1 : 0;
      }
    });

    return Array.from(groups.values()).sort((a, b) =>
      `${a.landlordName} ${a.name}`.localeCompare(`${b.landlordName} ${b.name}`),
    );
  }, [landlordMap, properties]);

  const propertyOptions = propertyGroups.map((group) => ({
    landlordId: group.landlordId,
    name: group.name,
    address: group.address,
  }));

  const resetForm = () => {
    setActiveForm(null);
    setEditingId(null);
    setPropertyForm(emptyPropertyForm);
    setUnitForm(emptyUnitForm);
  };

  const invalidateProperties = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "properties"] });

  const groupMutation = useMutation({
    mutationFn: (payload) =>
      editingId
        ? api.put(`/admin/properties/groups/${editingId}`, payload)
        : api.post("/admin/properties/groups", payload),
    onSuccess: () => {
      toast.success(editingId ? "প্রপার্টি আপডেট হয়েছে" : "প্রপার্টি যুক্ত হয়েছে");
      invalidateProperties();
      resetForm();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "প্রপার্টি সংরক্ষণ করা যায়নি"),
  });

  const unitMutation = useMutation({
    mutationFn: (payload) =>
      editingId
        ? api.put(`/admin/properties/${editingId}`, payload)
        : api.post("/admin/properties", payload),
    onSuccess: () => {
      toast.success(editingId ? "ইউনিট আপডেট হয়েছে" : "ইউনিট যুক্ত হয়েছে");
      invalidateProperties();
      resetForm();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "ইউনিট সংরক্ষণ করা যায়নি"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/properties/${id}`),
    onSuccess: () => {
      toast.success("মুছে ফেলা হয়েছে");
      invalidateProperties();
    },
    onError: (err) => toast.error(err.response?.data?.message || "মুছতে সমস্যা হয়েছে"),
  });

  const startAddProperty = () => {
    setEditingId(null);
    setPropertyForm({ ...emptyPropertyForm, landlordId: landlordFilter });
    setActiveForm("property");
  };

  const startAddUnit = () => {
    setEditingId(null);
    setUnitForm({ ...emptyUnitForm, landlordId: landlordFilter });
    setActiveForm("unit");
  };

  const startEditProperty = (group) => {
    if (!group.propertyRecord) {
      setPropertyForm({
        landlordId: group.landlordId,
        propertyName: group.name,
        propertyAddress: group.address,
        description: "",
      });
      setEditingId(null);
    } else {
      setPropertyForm({
        landlordId: group.landlordId,
        propertyName: group.propertyRecord.propertyName || "",
        propertyAddress: group.propertyRecord.propertyAddress || "",
        description: group.propertyRecord.description || "",
      });
      setEditingId(group.propertyRecord._id);
    }
    setActiveForm("property");
  };

  const startEditUnit = (property) => {
    const landlordId = String(property.landlordId?._id || property.landlordId || "");
    setUnitForm({
      landlordId,
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

  const handlePropertySubmit = (e) => {
    e.preventDefault();
    if (!propertyForm.landlordId || !propertyForm.propertyName) {
      return toast.error("বাড়ীওয়ালা ও প্রপার্টির নাম দিন");
    }
    groupMutation.mutate(propertyForm);
  };

  const handleUnitSubmit = (e) => {
    e.preventDefault();
    if (!unitForm.landlordId || !unitForm.propertyName || !unitForm.unitNumber || !unitForm.monthlyRent) {
      return toast.error("বাড়ীওয়ালা, প্রপার্টি, ইউনিট ও ভাড়া দিন");
    }
    unitMutation.mutate(unitForm);
  };

  return (
    <div className="py-4 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">প্রপার্টি</h1>
          <p className="text-sm text-gray-500">সব বাড়ীওয়ালার প্রপার্টি ও ইউনিট</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={startAddProperty}
            className="inline-flex items-center gap-2 rounded-xl border border-green-600 px-3 py-2.5 text-sm font-semibold text-green-700"
          >
            <Plus size={18} /> প্রপার্টি
          </button>
          <button
            type="button"
            onClick={startAddUnit}
            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-3 py-2.5 text-sm font-semibold text-white"
          >
            <Plus size={18} /> ইউনিট
          </button>
        </div>
      </div>

      <select
        value={landlordFilter}
        onChange={(e) => setLandlordFilter(e.target.value)}
        className={`${fieldClass} bg-white`}
      >
        <option value="">সব বাড়ীওয়ালা</option>
        {landlords.map((landlord) => (
          <option key={landlord._id} value={landlord._id}>
            {landlord.name} {landlord.phone ? `· ${landlord.phone}` : ""}
          </option>
        ))}
      </select>

      {activeForm === "property" && (
        <form onSubmit={handlePropertySubmit} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
          <FormHeader title={editingId ? "প্রপার্টি এডিট" : "নতুন প্রপার্টি"} onClose={resetForm} />
          <LandlordSelect landlords={landlords} value={propertyForm.landlordId} onChange={(landlordId) => setPropertyForm((f) => ({ ...f, landlordId }))} />
          <input
            placeholder="প্রপার্টি / বিল্ডিং নাম *"
            className={fieldClass}
            value={propertyForm.propertyName}
            onChange={(e) => setPropertyForm((f) => ({ ...f, propertyName: e.target.value }))}
          />
          <input
            placeholder="প্রপার্টির ঠিকানা"
            className={fieldClass}
            value={propertyForm.propertyAddress}
            onChange={(e) => setPropertyForm((f) => ({ ...f, propertyAddress: e.target.value }))}
          />
          <button disabled={groupMutation.isPending} className="w-full rounded-xl bg-green-600 py-3 font-semibold text-white disabled:bg-green-300">
            {groupMutation.isPending ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
          </button>
        </form>
      )}

      {activeForm === "unit" && (
        <form onSubmit={handleUnitSubmit} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
          <FormHeader title={editingId ? "ইউনিট এডিট" : "নতুন ইউনিট"} onClose={resetForm} />
          <div className="grid gap-3 sm:grid-cols-2">
            <LandlordSelect landlords={landlords} value={unitForm.landlordId} onChange={(landlordId) => setUnitForm((f) => ({ ...f, landlordId, propertyName: "", propertyAddress: "" }))} />
            <select
              className={`${fieldClass} bg-white`}
              value={unitForm.propertyName}
              onChange={(e) => {
                const selected = propertyOptions.find(
                  (property) => property.landlordId === unitForm.landlordId && property.name === e.target.value,
                );
                setUnitForm((f) => ({
                  ...f,
                  propertyName: e.target.value,
                  propertyAddress: selected?.address || f.propertyAddress,
                }));
              }}
            >
              <option value="">প্রপার্টি বেছে নিন *</option>
              {propertyOptions
                .filter((property) => !unitForm.landlordId || property.landlordId === unitForm.landlordId)
                .map((property) => (
                  <option key={`${property.landlordId}:${property.name}`} value={property.name}>
                    {property.name}
                  </option>
                ))}
            </select>
            <input placeholder="ইউনিট নম্বর *" className={fieldClass} value={unitForm.unitNumber} onChange={(e) => setUnitForm((f) => ({ ...f, unitNumber: e.target.value }))} />
            <input placeholder="তলা" className={fieldClass} value={unitForm.floor} onChange={(e) => setUnitForm((f) => ({ ...f, floor: e.target.value }))} />
            <select className={`${fieldClass} bg-white`} value={unitForm.type} onChange={(e) => setUnitForm((f) => ({ ...f, type: e.target.value }))}>
              <option value="flat">ফ্ল্যাট</option>
              <option value="room">রুম</option>
              <option value="shop">দোকান</option>
              <option value="office">অফিস</option>
            </select>
            <input type="number" placeholder="মাসিক ভাড়া *" className={fieldClass} value={unitForm.monthlyRent} onChange={(e) => setUnitForm((f) => ({ ...f, monthlyRent: e.target.value }))} />
          </div>
          <input placeholder="প্রপার্টির ঠিকানা" className={fieldClass} value={unitForm.propertyAddress} onChange={(e) => setUnitForm((f) => ({ ...f, propertyAddress: e.target.value }))} />
          <button disabled={unitMutation.isPending} className="w-full rounded-xl bg-green-600 py-3 font-semibold text-white disabled:bg-green-300">
            {unitMutation.isPending ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
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
          <p className="font-medium">কোনো প্রপার্টি নেই</p>
        </div>
      ) : (
        <div className="space-y-3">
          {propertyGroups.map((group) => (
            <section key={group.key} className="overflow-hidden rounded-xl bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-gray-500">{group.landlordName}</p>
                  <h2 className="truncate text-sm font-semibold text-gray-900">{group.name}</h2>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {group.address || "ঠিকানা দেওয়া নেই"} · {group.occupied}/{group.units.length} দখলকৃত
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  <button type="button" onClick={() => startEditProperty(group)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
                    <Edit3 size={17} />
                  </button>
                  {group.propertyRecord && (
                    <button type="button" onClick={() => deleteMutation.mutate(group.propertyRecord._id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50">
                      <Trash2 size={17} />
                    </button>
                  )}
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {group.units.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-400">কোনো ইউনিট নেই</p>
                ) : (
                  group.units.map((property) => (
                    <div key={property._id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="truncate font-semibold text-gray-900">{property.unitNumber}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${property.isOccupied ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {property.isOccupied ? "দখলকৃত" : "খালি"}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {typeLabels[property.type] || property.type}
                          {property.floor ? ` · ${property.floor} তলা` : ""} · ৳{Number(property.monthlyRent || 0).toLocaleString("bn-BD")}
                        </p>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-1">
                        <button type="button" onClick={() => startEditUnit(property)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
                          <Edit3 size={17} />
                        </button>
                        <button type="button" disabled={property.isOccupied || deleteMutation.isPending} onClick={() => deleteMutation.mutate(property._id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-gray-300">
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function FormHeader({ title, onClose }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="font-semibold text-gray-800">{title}</h2>
      <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
        <X size={18} />
      </button>
    </div>
  );
}

function LandlordSelect({ landlords, value, onChange }) {
  return (
    <select className={`${fieldClass} bg-white`} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">বাড়ীওয়ালা বেছে নিন *</option>
      {landlords.map((landlord) => (
        <option key={landlord._id} value={landlord._id}>
          {landlord.name} {landlord.phone ? `· ${landlord.phone}` : ""}
        </option>
      ))}
    </select>
  );
}
