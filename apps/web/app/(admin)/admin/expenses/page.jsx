"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { request } from "@/lib/query";

const CATEGORIES = [
  { value: "operations", label: "অপারেশন" },
  { value: "salary", label: "বেতন" },
  { value: "marketing", label: "মার্কেটিং" },
  { value: "software", label: "সফটওয়্যার" },
  { value: "office", label: "অফিস" },
  { value: "other", label: "অন্যান্য" },
];

const currentMonthValue = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export default function AdminExpensesPage() {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(currentMonthValue());
  const [showForm, setShowForm] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [form, setForm] = useState({
    title: "",
    amount: "",
    category: "other",
    date: "",
    note: "",
  });

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["admin", "system-expenses", month],
    queryFn: () => request({ url: `/admin/system-expenses?month=${month}` }),
  });

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "system-expenses", month] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "system-finance"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] }),
    ]);

  const createMutation = useMutation({
    mutationFn: (payload) => api.post("/admin/system-expenses", payload),
    onSuccess: async () => {
      toast.success("সিস্টেম খরচ যুক্ত হয়েছে");
      resetForm();
      await refresh();
    },
    onError: (err) => toast.error(err.response?.data?.message || "খরচ যুক্ত করা যায়নি"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/admin/system-expenses/${id}`, payload),
    onSuccess: async () => {
      toast.success("সিস্টেম খরচ আপডেট হয়েছে");
      resetForm();
      await refresh();
    },
    onError: (err) => toast.error(err.response?.data?.message || "খরচ আপডেট করা যায়নি"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/system-expenses/${id}`),
    onSuccess: async () => {
      toast.success("সিস্টেম খরচ মুছে গেছে");
      await refresh();
    },
    onError: (err) => toast.error(err.response?.data?.message || "খরচ মুছতে পারেনি"),
  });

  const total = useMemo(
    () => expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [expenses],
  );

  const resetForm = () => {
    setShowForm(false);
    setEditingExpenseId(null);
    setForm({ title: "", amount: "", category: "other", date: "", note: "" });
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.title || !form.amount) {
      toast.error("শিরোনাম ও পরিমাণ দিন");
      return;
    }

    const payload = {
      title: form.title,
      amount: Number(form.amount),
      category: form.category,
      date: form.date || undefined,
      note: form.note,
      month,
    };

    if (editingExpenseId) {
      updateMutation.mutate({ id: editingExpenseId, payload });
      return;
    }

    createMutation.mutate(payload);
  };

  const startEdit = (expense) => {
    setEditingExpenseId(expense._id);
    setShowForm(true);
    setForm({
      title: expense.title || "",
      amount: String(expense.amount || ""),
      category: expense.category || "other",
      date: expense.date ? new Date(expense.date).toISOString().slice(0, 10) : "",
      note: expense.note || "",
    });
  };

  return (
    <div className="space-y-5 py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-950">সিস্টেম খরচ</h1>
          <p className="text-sm text-gray-500">
            সুপার অ্যাডমিন এখান থেকে প্ল্যাটফর্মের মাসভিত্তিক খরচ যোগ করবেন।
          </p>
        </div>
        <button
          onClick={() => {
            if (showForm && !editingExpenseId) {
              resetForm();
              return;
            }
            setShowForm(true);
            setEditingExpenseId(null);
            setForm({ title: "", amount: "", category: "other", date: "", note: "" });
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 text-sm font-bold text-white"
        >
          <Plus size={16} />
          {showForm && !editingExpenseId ? "ফর্ম বন্ধ করুন" : "খরচ যোগ করুন"}
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-[220px_1fr]">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm"
        />
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3">
          <p className="text-xs font-semibold text-emerald-800">{month} মাসের মোট খরচ</p>
          <p className="mt-1 text-2xl font-black text-emerald-900">
            ৳{total.toLocaleString("bn-BD")}
          </p>
        </div>
      </div>

      {showForm && (
        <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm md:grid-cols-2">
          <Field label="খরচের শিরোনাম">
            <input
              value={form.title}
              onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
              className="rounded-lg border border-gray-200 px-3 py-2"
            />
          </Field>
          <Field label="পরিমাণ">
            <input
              type="number"
              min="0"
              value={form.amount}
              onChange={(e) => setForm((current) => ({ ...current, amount: e.target.value }))}
              className="rounded-lg border border-gray-200 px-3 py-2"
            />
          </Field>
          <Field label="ক্যাটাগরি">
            <select
              value={form.category}
              onChange={(e) => setForm((current) => ({ ...current, category: e.target.value }))}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2"
            >
              {CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="তারিখ">
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((current) => ({ ...current, date: e.target.value }))}
              className="rounded-lg border border-gray-200 px-3 py-2"
            />
          </Field>
          <Field label="নোট" className="md:col-span-2">
            <textarea
              rows={3}
              value={form.note}
              onChange={(e) => setForm((current) => ({ ...current, note: e.target.value }))}
              className="rounded-lg border border-gray-200 px-3 py-2"
            />
          </Field>
          <div className="flex gap-2 md:col-span-2">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {createMutation.isPending || updateMutation.isPending
                ? "সংরক্ষণ..."
                : editingExpenseId
                  ? "খরচ আপডেট করুন"
                  : "খরচ সংরক্ষণ"}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {isLoading ? (
          [1, 2, 3].map((item) => (
            <div key={item} className="h-20 animate-pulse rounded-2xl bg-gray-100" />
          ))
        ) : expenses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
            {month} মাসে কোনো সিস্টেম খরচ নেই
          </div>
        ) : (
          expenses.map((expense) => (
            <div key={expense._id} className="flex items-start justify-between rounded-2xl bg-white p-4 shadow-sm">
              <div>
                <p className="font-bold text-gray-900">{expense.title}</p>
                <p className="mt-1 text-sm text-gray-500">
                  {CATEGORIES.find((item) => item.value === expense.category)?.label || expense.category}
                  {expense.date
                    ? ` · ${new Date(expense.date).toLocaleDateString("bn-BD")}`
                    : ""}
                </p>
                {expense.note && (
                  <p className="mt-1 text-sm text-gray-500">{expense.note}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-lg font-black text-gray-900">
                  ৳{Number(expense.amount || 0).toLocaleString("bn-BD")}
                </p>
                <button
                  onClick={() => startEdit(expense)}
                  className="rounded-full bg-emerald-50 p-2 text-emerald-700"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => {
                    if (!confirm("এই সিস্টেম খরচ মুছবেন?")) return;
                    deleteMutation.mutate(expense._id);
                  }}
                  className="rounded-full bg-red-50 p-2 text-red-600"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Field({ label, className = "", children }) {
  return (
    <label className={`grid gap-1.5 text-sm font-medium text-gray-700 ${className}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}
