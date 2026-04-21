"use client";
import { useEffect, useMemo, useState } from "react";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import { BadgePlus, Pencil, ReceiptText, Trash2, TrendingDown } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import api from "@/lib/api";
import { request } from "@/lib/query";

const MONTH_LABELS = [
  "জানু",
  "ফেব্রু",
  "মার্চ",
  "এপ্রিল",
  "মে",
  "জুন",
  "জুলাই",
  "আগস্ট",
  "সেপ্টে",
  "অক্টো",
  "নভে",
  "ডিসে",
];

const EXPENSE_CATEGORIES = [
  { value: "utilities", label: "ইউটিলিটি" },
  { value: "salary", label: "বেতন" },
  { value: "maintenance", label: "রক্ষণাবেক্ষণ" },
  { value: "repair", label: "মেরামত" },
  { value: "cleaning", label: "পরিষ্কার" },
  { value: "security", label: "নিরাপত্তা" },
  { value: "other", label: "অন্যান্য" },
];

const formatMoney = (amount) => `৳${Number(amount || 0).toLocaleString("bn-BD")}`;
const toMonthValue = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = toMonthValue(now);
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [expenseForm, setExpenseForm] = useState({
    title: "",
    amount: "",
    category: "other",
  });
  const { data: me } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => request({ url: "/auth/me" }),
  });
  const [yearlyQuery, monthlyQuery] = useQueries({
    queries: [
      {
        queryKey: ["landlord", "reports", "yearly", year],
        queryFn: () =>
          request({ url: `/landlord/reports/yearly?year=${year}` }),
      },
      {
        queryKey: ["landlord", "reports", "monthly", month],
        queryFn: () =>
          request({ url: `/landlord/reports/monthly?month=${month}` }),
      },
    ],
  });
  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ["landlord", "expenses", month],
    queryFn: () => request({ url: `/landlord/expenses?month=${month}` }),
  });
  const yearly = yearlyQuery.data;
  const monthly = monthlyQuery.data;
  const loading = yearlyQuery.isLoading || monthlyQuery.isLoading;
  const reportMonths = Math.max(1, Number(me?.planFeatures?.reportMonths || 1));

  const earliestAllowedMonth = useMemo(() => {
    const earliest = new Date(`${currentMonth}-01`);
    earliest.setMonth(earliest.getMonth() - reportMonths + 1);
    return toMonthValue(earliest);
  }, [currentMonth, reportMonths]);

  const yearOptions = useMemo(() => {
    const earliestYear = Number(earliestAllowedMonth.slice(0, 4));
    return Array.from(
      { length: currentYear - earliestYear + 1 },
      (_, index) => currentYear - index,
    );
  }, [currentYear, earliestAllowedMonth]);

  useEffect(() => {
    if (month < earliestAllowedMonth) {
      setMonth(earliestAllowedMonth);
      setYear(Number(earliestAllowedMonth.slice(0, 4)));
    }
  }, [earliestAllowedMonth, month]);

  const addExpenseMutation = useMutation({
    mutationFn: async (payload) => api.post("/landlord/expenses", payload),
    onSuccess: async () => {
      toast.success("খরচ যুক্ত হয়েছে");
      setShowExpenseForm(false);
      setExpenseForm({ title: "", amount: "", category: "other" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["landlord", "expenses", month] }),
        queryClient.invalidateQueries({ queryKey: ["landlord", "reports", "monthly", month] }),
        queryClient.invalidateQueries({ queryKey: ["landlord", "reports", "yearly", year] }),
      ]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "খরচ যুক্ত করা যায়নি");
    },
  });
  const updateExpenseMutation = useMutation({
    mutationFn: async ({ id, payload }) => api.put(`/landlord/expenses/${id}`, payload),
    onSuccess: async () => {
      toast.success("খরচ আপডেট হয়েছে");
      setShowExpenseForm(false);
      setEditingExpenseId(null);
      setExpenseForm({ title: "", amount: "", category: "other" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["landlord", "expenses", month] }),
        queryClient.invalidateQueries({ queryKey: ["landlord", "reports", "monthly", month] }),
        queryClient.invalidateQueries({ queryKey: ["landlord", "reports", "yearly", year] }),
      ]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "খরচ আপডেট করা যায়নি");
    },
  });
  const deleteExpenseMutation = useMutation({
    mutationFn: async (id) => api.delete(`/landlord/expenses/${id}`),
    onSuccess: async () => {
      toast.success("খরচ মুছে গেছে");
      if (editingExpenseId) {
        setEditingExpenseId(null);
        setShowExpenseForm(false);
        setExpenseForm({ title: "", amount: "", category: "other" });
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["landlord", "expenses", month] }),
        queryClient.invalidateQueries({ queryKey: ["landlord", "reports", "monthly", month] }),
        queryClient.invalidateQueries({ queryKey: ["landlord", "reports", "yearly", year] }),
      ]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "খরচ মুছতে সমস্যা হয়েছে");
    },
  });

  const chartData = useMemo(
    () =>
      yearly?.monthlyBreakdown?.map((m, i) => ({
        name: MONTH_LABELS[i],
        আদায়: m.collected,
        খরচ: m.expenses,
        লাভ: m.profit,
      })) || [],
    [yearly],
  );

  const expenseTotal = useMemo(
    () => expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    [expenses],
  );

  const handleExpenseSubmit = (e) => {
    e.preventDefault();
    if (!expenseForm.title || !expenseForm.amount) {
      toast.error("খরচের নাম ও পরিমাণ দিন");
      return;
    }

    const payload = {
      title: expenseForm.title,
      amount: Number(expenseForm.amount),
      category: expenseForm.category,
      month,
    };

    if (editingExpenseId) {
      updateExpenseMutation.mutate({ id: editingExpenseId, payload });
      return;
    }

    addExpenseMutation.mutate(payload);
  };

  const startExpenseEdit = (expense) => {
    setEditingExpenseId(expense._id);
    setShowExpenseForm(true);
    setExpenseForm({
      title: expense.title || "",
      amount: String(expense.amount || ""),
      category: expense.category || "other",
    });
  };

  const handleExpenseDelete = (expenseId) => {
    if (!confirm("এই খরচ মুছবেন?")) return;
    deleteExpenseMutation.mutate(expenseId);
  };

  return (
    <div className="py-4 space-y-5">
      <h1 className="text-xl font-bold text-gray-900">রিপোর্ট</h1>

      {/* Year selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-600 whitespace-nowrap">
          বার্ষিক:
        </label>
        <select
          className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {[
            ...yearOptions,
          ].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        আপনার প্ল্যানে সর্বশেষ {reportMonths} মাসের রিপোর্ট দেখা যাবে। এখন
        {earliestAllowedMonth} থেকে {currentMonth} পর্যন্ত মাস নির্বাচন করা যাবে।
      </div>

      {/* Yearly summary cards */}
      {yearly && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-50 rounded-2xl p-3 text-center">
            <p className="text-xs text-gray-500">মোট আদায়</p>
            <p className="font-bold text-green-700 mt-1 text-sm">
              ৳{(yearly.totalCollected / 1000).toFixed(1)}K
            </p>
          </div>
          <div className="bg-red-50 rounded-2xl p-3 text-center">
            <p className="text-xs text-gray-500">মোট খরচ</p>
            <p className="font-bold text-red-600 mt-1 text-sm">
              ৳{(yearly.totalExpenses / 1000).toFixed(1)}K
            </p>
          </div>
          <div className="bg-blue-50 rounded-2xl p-3 text-center">
            <p className="text-xs text-gray-500">মোট লাভ</p>
            <p className="font-bold text-blue-700 mt-1 text-sm">
              ৳{(yearly.totalProfit / 1000).toFixed(1)}K
            </p>
          </div>
        </div>
      )}

      {/* Bar chart */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="font-semibold text-gray-700 mb-4">
          {year} সালের মাসিক চিত্র
        </h2>
        {loading ? (
          <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={chartData}
              margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `৳${v.toLocaleString()}`} />
              <Bar dataKey="আদায়" fill="#16a34a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="খরচ" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Monthly detail */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <label className="text-sm font-medium text-gray-600 whitespace-nowrap">
            মাসিক:
          </label>
          <input
            type="month"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            min={earliestAllowedMonth}
            max={currentMonth}
          />
        </div>

        <div className="rounded-lg border border-emerald-100 bg-white p-4 shadow-sm my-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <TrendingDown size={14} />
                মাসিক খরচ ব্যবস্থাপনা
              </div>
              <h2 className="mt-3 text-lg font-bold text-gray-900">
                রিপোর্ট দেখার সময়ই খরচ যোগ বা এডিট করুন
              </h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                এই মাসের রিপোর্টের খরচ হিসাব এখান থেকেই আপডেট হবে।
              </p>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto lg:min-w-[300px]">
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3">
                <p className="text-xs font-medium text-emerald-800">এই মাসের মোট খরচ</p>
                <p className="mt-1 text-2xl font-bold text-emerald-900">
                  {formatMoney(expenseTotal)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowExpenseForm((open) => !open)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white"
              >
                <BadgePlus size={16} />
                {showExpenseForm ? "ফর্ম বন্ধ করুন" : "খরচ যোগ করুন"}
              </button>
            </div>
          </div>

          {showExpenseForm && (
            <form
              onSubmit={handleExpenseSubmit}
              className="mt-4 grid gap-3 border-t border-emerald-100 pt-4 md:grid-cols-2"
            >
              <input
                type="text"
                placeholder="খরচের শিরোনাম"
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={expenseForm.title}
                onChange={(e) =>
                  setExpenseForm((form) => ({ ...form, title: e.target.value }))
                }
              />
              <input
                type="number"
                min="0"
                placeholder="পরিমাণ (৳)"
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={expenseForm.amount}
                onChange={(e) =>
                  setExpenseForm((form) => ({ ...form, amount: e.target.value }))
                }
              />
              <select
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={expenseForm.category}
                onChange={(e) =>
                  setExpenseForm((form) => ({ ...form, category: e.target.value }))
                }
              >
                {EXPENSE_CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowExpenseForm(false);
                    setEditingExpenseId(null);
                    setExpenseForm({ title: "", amount: "", category: "other" });
                  }}
                  className="flex-1 rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={addExpenseMutation.isPending || updateExpenseMutation.isPending}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:bg-emerald-300"
                >
                  {addExpenseMutation.isPending || updateExpenseMutation.isPending
                    ? "সংরক্ষণ..."
                    : editingExpenseId
                      ? "খরচ আপডেট করুন"
                      : "খরচ সংরক্ষণ"}
                </button>
              </div>
            </form>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {expensesLoading ? (
              [1, 2].map((item) => (
                <div key={item} className="h-20 animate-pulse rounded-lg bg-gray-100" />
              ))
            ) : expenses.length ? (
              expenses.map((expense) => (
                <div
                  key={expense._id}
                  className="flex items-start justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-gray-600">
                      <ReceiptText size={12} />
                      {EXPENSE_CATEGORIES.find((item) => item.value === expense.category)
                        ?.label || expense.category}
                    </div>
                    <p className="mt-2 truncate text-sm font-semibold text-gray-900">
                      {expense.title}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">{month} মাস</p>
                  </div>
                  <div className="flex items-center gap-3 pl-3">
                    <p className="text-sm font-bold text-gray-900">
                      {formatMoney(expense.amount)}
                    </p>
                    <button
                      type="button"
                      onClick={() => startExpenseEdit(expense)}
                      className="rounded-full bg-white p-2 text-emerald-700"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExpenseDelete(expense._id)}
                      className="rounded-full bg-white p-2 text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500 sm:col-span-2">
                এই মাসে এখনো কোনো খরচ যোগ করা হয়নি
              </div>
            )}
          </div>
        </div>

        {monthly && (
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <h2 className="font-semibold text-gray-700">{month} মাসের বিবরণ</h2>
            {[
              {
                label: "বসবাসরত ভাড়াটিয়া ",
                value: monthly.activeTenants,
                unit: "জন",
              },
              {
                label: "মোট বিল",
                value: `৳${monthly.totalBilled?.toLocaleString()}`,
                unit: "",
              },
              {
                label: "আদায়",
                value: `৳${monthly.totalCollected?.toLocaleString()}`,
                unit: "",
              },
              {
                label: "বকেয়া",
                value: `৳${monthly.totalDue?.toLocaleString()}`,
                unit: "",
              },
              {
                label: "মোট খরচ",
                value: `৳${monthly.totalExpenses?.toLocaleString()}`,
                unit: "",
              },
              {
                label: "নিট লাভ",
                value: `৳${monthly.profit?.toLocaleString()}`,
                unit: "",
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <span className="text-gray-600">{row.label}</span>
                <span className="font-semibold text-gray-900">
                  {row.value}
                  {row.unit}
                </span>
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <div className="flex-1 bg-green-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">পরিশোধিত</p>
                <p className="text-xl font-bold text-green-600">
                  {monthly.statusBreakdown?.paid}
                </p>
              </div>
              <div className="flex-1 bg-yellow-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">আংশিক</p>
                <p className="text-xl font-bold text-yellow-600">
                  {monthly.statusBreakdown?.partial}
                </p>
              </div>
              <div className="flex-1 bg-red-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">অপরিশোধিত</p>
                <p className="text-xl font-bold text-red-600">
                  {monthly.statusBreakdown?.unpaid}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
