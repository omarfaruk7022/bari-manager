"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  CreditCard,
  Banknote,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";
import api from "@/lib/api";

const STATUS_CONFIG = {
  paid: { label: "পরিশোধিত", bg: "bg-green-100", text: "text-green-700" },
  partial: { label: "আংশিক", bg: "bg-yellow-100", text: "text-yellow-700" },
  unpaid: { label: "অপরিশোধিত", bg: "bg-red-100", text: "text-red-700" },
};
const ITEM_LABELS = {
  rent: "ভাড়া",
  electricity: "বিদ্যুৎ",
  gas: "গ্যাস",
  water: "পানি",
  garbage: "ময়লা",
  internet: "ইন্টারনেট",
  maintenance: "সার্ভিস চার্জ",
  custom: "অন্যান্য",
};

export function BillCard({ bill, role, queryKey }) {
  const [expanded, setExpanded] = useState(false);
  const [cashAmount, setCashAmt] = useState("");
  const [showCash, setShowCash] = useState(false);
  const [invoiceHtml, setInvoiceHtml] = useState("");
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const queryClient = useQueryClient();
  const cfg = STATUS_CONFIG[bill.status] || STATUS_CONFIG.unpaid;
  const canMarkCash = role === "landlord" && bill.status !== "paid";
  const canPay = role === "tenant" && bill.status !== "paid";

  const invoicePath = `/${role === "landlord" ? "landlord" : "tenant"}/bills/${bill._id}/invoice`;

  const refresh = async () => {
    if (queryKey) await queryClient.invalidateQueries({ queryKey });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["landlord", "bills"] }),
      queryClient.invalidateQueries({ queryKey: ["landlord", "recent-bills"] }),
      queryClient.invalidateQueries({ queryKey: ["landlord", "dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["tenant", "payments"] }),
    ]);
  };

  const bkashMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/tenant/payments/bkash/init", {
        billId: bill._id,
        amount: bill.dueAmount,
      });
      return res.data;
    },
    onSuccess: (data) => {
      window.location.href = data.bkashURL;
    },
    onError: (err) =>
      toast.error(
        err.response?.data?.message || "bKash পেমেন্ট শুরু করা যায়নি",
      ),
  });

  const cashMutation = useMutation({
    mutationFn: (amount) =>
      api.post("/landlord/payments/cash", { billId: bill._id, amount }),
    onSuccess: async () => {
      toast.success("নগদ পেমেন্ট রেকর্ড হয়েছে");
      setShowCash(false);
      setCashAmt("");
      await refresh();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "সমস্যা হয়েছে"),
  });

  const openInvoice = async () => {
    setInvoiceOpen(true);
    setInvoiceLoading(true);
    try {
      const res = await api.get(invoicePath, { responseType: "text" });
      setInvoiceHtml(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "রসিদ লোড করা যায়নি");
      setInvoiceOpen(false);
    } finally {
      setInvoiceLoading(false);
    }
  };

  const printInvoice = () => {
    const frame = document.getElementById(`invoice-frame-${bill._id}`);
    frame?.contentWindow?.focus();
    frame?.contentWindow?.print();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-bold text-gray-900 text-base">
              {bill.month} মাসের বিল
            </p>
            {bill.tenantId?.name && (
              <p className="text-sm text-gray-500 mt-0.5">
                {bill.tenantId.name} • {bill.propertyId?.unitNumber}
              </p>
            )}
            {bill.dueDate && (
              <p className="text-xs text-gray-400 mt-1">
                শেষ তারিখ: {new Date(bill.dueDate).toLocaleDateString("bn-BD")}
              </p>
            )}
          </div>
          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full ${cfg.bg} ${cfg.text}`}
          >
            {cfg.label}
          </span>
        </div>

        <div className="flex items-end justify-between mt-3">
          <div>
            <p className="text-xs text-gray-400">মোট</p>
            <p className="text-2xl font-bold text-gray-900">
              ৳{bill.totalAmount?.toLocaleString()}
            </p>
          </div>
          {bill.status !== "unpaid" && (
            <div className="text-right">
              <p className="text-xs text-gray-400">পরিশোধিত</p>
              <p className="text-lg font-semibold text-green-600">
                ৳{bill.paidAmount?.toLocaleString()}
              </p>
            </div>
          )}
          {bill.dueAmount > 0 && (
            <div className="text-right">
              <p className="text-xs text-gray-400">বকেয়া</p>
              <p className="text-lg font-semibold text-red-600">
                ৳{bill.dueAmount?.toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {bill.status !== "unpaid" && (
          <div className="mt-3 bg-gray-100 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full"
              style={{
                width: `${Math.min(100, (bill.paidAmount / bill.totalAmount) * 100)}%`,
              }}
            />
          </div>
        )}
      </div>

      {/* Expand items */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-500 border-t border-gray-50"
      >
        <span>বিস্তারিত</span>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-1 border-t border-gray-50">
          {bill.items?.map((item, i) => (
            <div
              key={i}
              className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0"
            >
              <span className="text-gray-600">
                {item.label || ITEM_LABELS[item.type] || item.type}
              </span>
              <span className="font-medium text-gray-800">
                ৳{item.amount?.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Invoice button — always visible */}
      <div className="px-4 pb-3 border-t border-gray-50 pt-3">
        <button
          onClick={openInvoice}
          className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50"
        >
          <FileText size={15} /> রসিদ দেখুন / প্রিন্ট করুন
        </button>
      </div>

      {/* Tenant bKash */}
      {canPay && (
        <div className="px-4 pb-4 border-t border-gray-50">
          <button
            onClick={() => bkashMutation.mutate()}
            disabled={bkashMutation.isPending}
            className="w-full bg-pink-600 disabled:bg-pink-300 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
          >
            <CreditCard size={16} />
            {bkashMutation.isPending
              ? "অপেক্ষা করুন..."
              : "bKash দিয়ে পে করুন"}
          </button>
        </div>
      )}

      {/* Landlord cash */}
      {canMarkCash && !showCash && (
        <div className="px-4 pb-4 border-t border-gray-50">
          <button
            onClick={() => setShowCash(true)}
            className="w-full border border-green-500 text-green-600 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Banknote size={16} /> নগদ পেমেন্ট রেকর্ড করুন
          </button>
        </div>
      )}

      {showCash && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-50 pt-3">
          <p className="text-sm font-medium text-gray-700">
            নগদ পরিমাণ (বকেয়া: ৳{bill.dueAmount})
          </p>
          <input
            type="number"
            placeholder={`সর্বোচ্চ ৳${bill.dueAmount}`}
            min="1"
            max={bill.dueAmount}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
            value={cashAmount}
            onChange={(e) => setCashAmt(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowCash(false);
                setCashAmt("");
              }}
              className="flex-1 border border-gray-200 py-3 rounded-xl text-sm font-medium text-gray-600"
            >
              বাতিল
            </button>
            <button
              onClick={() => {
                const amt = Number(cashAmount);
                if (!amt || amt <= 0) return toast.error("পরিমাণ দিন");
                if (amt > bill.dueAmount)
                  return toast.error(`বকেয়ার চেয়ে বেশি দেওয়া যাবে না`);
                cashMutation.mutate(amt);
              }}
              disabled={cashMutation.isPending}
              className="flex-1 bg-green-600 text-white py-3 rounded-xl text-sm font-semibold disabled:bg-green-300"
            >
              {cashMutation.isPending ? "সংরক্ষণ..." : "নিশ্চিত করুন"}
            </button>
          </div>
        </div>
      )}

      {invoiceOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-3">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <div>
                {/* <p className="text-base font-bold text-gray-900">বাংলা রসিদ</p> */}
                <p className="text-xs text-gray-500">{bill.month} মাসের বিল</p>
              </div>
              <button
                onClick={() => setInvoiceOpen(false)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600"
              >
                বন্ধ
              </button>
            </div>
            <div className="min-h-[60vh] flex-1 bg-gray-100">
              {invoiceLoading ? (
                <div className="flex h-[60vh] items-center justify-center text-sm font-medium text-gray-500">
                  রসিদ লোড হচ্ছে...
                </div>
              ) : (
                <iframe
                  id={`invoice-frame-${bill._id}`}
                  title="রসিদ"
                  srcDoc={invoiceHtml}
                  className="h-[70vh] w-full bg-white"
                />
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 px-4 py-3">
              <button
                onClick={() => setInvoiceOpen(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700"
              >
                বাতিল
              </button>
              <button
                onClick={printInvoice}
                disabled={invoiceLoading || !invoiceHtml}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                প্রিন্ট করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
