"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import api from "@/lib/api";

export default function NewPropertyPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    propertyName: "",
    propertyAddress: "",
    unitNumber: "",
    floor: "",
    type: "flat",
    monthlyRent: "",
    description: "",
  });
  const createPropertyMutation = useMutation({
    mutationFn: async (payload) => api.post("/landlord/properties", payload),
    onSuccess: () => {
      toast.success("Property created!");
      router.push("/landlord/tenants/new");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Error");
    },
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.propertyName || !form.unitNumber || !form.monthlyRent) {
      return toast.error("Required fields missing");
    }

    createPropertyMutation.mutate(form);
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Add Property</h1>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          placeholder="Property / Building Name"
          className="input"
          value={form.propertyName}
          onChange={(e) => set("propertyName", e.target.value)}
        />

        <input
          placeholder="Property Address"
          className="input"
          value={form.propertyAddress}
          onChange={(e) => set("propertyAddress", e.target.value)}
        />

        <input
          placeholder="Unit Number"
          className="input"
          value={form.unitNumber}
          onChange={(e) => set("unitNumber", e.target.value)}
        />

        <input
          placeholder="Floor"
          className="input"
          value={form.floor}
          onChange={(e) => set("floor", e.target.value)}
        />

        <select
          className="input"
          value={form.type}
          onChange={(e) => set("type", e.target.value)}
        >
          <option value="flat">Flat</option>
          <option value="room">Room</option>
          <option value="shop">Shop</option>
          <option value="office">Office</option>
        </select>

        <input
          type="number"
          placeholder="Monthly Rent"
          className="input"
          value={form.monthlyRent}
          onChange={(e) => set("monthlyRent", e.target.value)}
        />

        <textarea
          placeholder="Description"
          className="input"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />

        <button
          disabled={createPropertyMutation.isPending}
          className="w-full bg-green-600 text-white py-3 rounded-xl"
        >
          {createPropertyMutation.isPending ? "Saving..." : "Create Property"}
        </button>
      </form>
    </div>
  );
}
