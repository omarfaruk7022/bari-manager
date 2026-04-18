"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Eye, EyeOff, LogIn, Phone, Mail, ArrowLeft } from "lucide-react";
import api from "@/lib/api";
import { storeAuth } from "@/lib/auth";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("login"); // login | forgot | otp | reset
  const [loginBy, setLoginBy] = useState("phone"); // phone | email
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [showPass, setShow] = useState(false);
  const [forgotId, setForgotId] = useState("");
  const [otp, setOtp] = useState("");
  const [newPass, setNewPass] = useState("");
  const [otpVia, setOtpVia] = useState("sms");

  const loginMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/auth/login", payload);
      return res.data;
    },
    onSuccess: (data) => {
      storeAuth({ token: data.token, user: data.user });
      toast.success("লগইন সফল!");
      router.push(data.redirect);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "লগইন ব্যর্থ হয়েছে");
    },
  });

  const forgotMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/auth/forgot-password", payload);
      return res.data;
    },
    onSuccess: (data) => {
      setOtpVia(data.via || "sms");
      setMode("otp");
      toast.success(
        data.via === "sms"
          ? "OTP SMS পাঠানো হয়েছে"
          : "OTP ইমেইলে পাঠানো হয়েছে",
      );
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "সমস্যা হয়েছে"),
  });

  const resetMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/auth/reset-password", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("পাসওয়ার্ড পরিবর্তন হয়েছে! লগইন করুন।");
      setMode("login");
      setOtp("");
      setNewPass("");
      setForgotId("");
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "সমস্যা হয়েছে"),
  });

  const handleLogin = (e) => {
    e.preventDefault();
    if (!form.identifier || !form.password) return toast.error("সব তথ্য দিন");
    const payload =
      loginBy === "phone"
        ? { phone: form.identifier, password: form.password }
        : { email: form.identifier, password: form.password };
    loginMutation.mutate(payload);
  };

  const handleForgot = (e) => {
    e.preventDefault();
    if (!forgotId) return toast.error("মোবাইল নম্বর বা ইমেইল দিন");
    const isPhone = /^[0-9+]/.test(forgotId);
    forgotMutation.mutate(isPhone ? { phone: forgotId } : { email: forgotId });
  };

  const handleReset = (e) => {
    e.preventDefault();
    if (!otp || !newPass) return toast.error("OTP ও নতুন পাসওয়ার্ড দিন");
    if (newPass.length < 6)
      return toast.error("পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে");
    const isPhone = /^[0-9+]/.test(forgotId);
    resetMutation.mutate(
      isPhone
        ? { phone: forgotId, otp, newPassword: newPass }
        : { email: forgotId, otp, newPassword: newPass },
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-3xl font-bold">বা</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">BariManager</h1>
          <p className="text-gray-500 mt-1">বাড়ি ভাড়া ব্যবস্থাপনা সিস্টেম</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          {/* ── LOGIN ── */}
          {mode === "login" && (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-5 text-center">
                লগইন করুন
              </h2>

              {/* Toggle phone/email */}
              <div className="flex rounded-xl border border-gray-200 overflow-hidden mb-5">
                <button
                  onClick={() => setLoginBy("phone")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors cursor-pointer ${loginBy === "phone" ? "bg-green-600 text-white" : "text-gray-500"}`}
                >
                  <Phone size={15} /> মোবাইল
                </button>
                <button
                  onClick={() => setLoginBy("email")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors cursor-pointer ${loginBy === "email" ? "bg-green-600 text-white" : "text-gray-500"}`}
                >
                  <Mail size={15} /> ইমেইল
                </button>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {loginBy === "phone" ? "মোবাইল নম্বর" : "ইমেইল"}
                  </label>
                  <input
                    type={loginBy === "phone" ? "tel" : "email"}
                    placeholder={
                      loginBy === "phone" ? "01XXXXXXXXX" : "আপনার ইমেইল"
                    }
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={form.identifier}
                    onChange={(e) =>
                      setForm({ ...form, identifier: e.target.value })
                    }
                    autoComplete={loginBy === "phone" ? "tel" : "email"}
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      পাসওয়ার্ড
                    </label>
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-xs text-green-600 font-medium cursor-pointer"
                    >
                      পাসওয়ার্ড ভুলে গেছেন?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      placeholder="পাসওয়ার্ড"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                      value={form.password}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShow(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-1 cursor-pointer"
                    >
                      {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loginMutation.isPending}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold py-3 rounded-xl text-base flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loginMutation.isPending ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <LogIn size={20} />
                  )}
                  {loginMutation.isPending ? "অপেক্ষা করুন..." : "লগইন"}
                </button>
              </form>
            </>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {mode === "forgot" && (
            <>
              <div className="flex items-center gap-3 mb-5">
                <button
                  onClick={() => setMode("login")}
                  className="p-1.5 rounded-lg bg-gray-100 cursor-pointer"
                >
                  <ArrowLeft size={18} />
                </button>
                <h2 className="text-lg font-semibold text-gray-800">
                  পাসওয়ার্ড ভুলেছেন
                </h2>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                আপনার মোবাইল নম্বর বা ইমেইল দিন। OTP পাঠানো হবে।
              </p>
              <form onSubmit={handleForgot} className="space-y-4">
                <input
                  type="text"
                  placeholder="01XXXXXXXXX বা ইমেইল"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                  value={forgotId}
                  onChange={(e) => setForgotId(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={forgotMutation.isPending}
                  className="w-full bg-green-600 text-white font-semibold py-3 rounded-xl disabled:bg-green-300 cursor-pointer"
                >
                  {forgotMutation.isPending ? "পাঠানো হচ্ছে..." : "OTP পাঠান"}
                </button>
              </form>
            </>
          )}

          {/* ── OTP VERIFY ── */}
          {mode === "otp" && (
            <>
              <div className="flex items-center gap-3 mb-5">
                <button
                  onClick={() => setMode("forgot")}
                  className="p-1.5 rounded-lg bg-gray-100 cursor-pointer"
                >
                  <ArrowLeft size={18} />
                </button>
                <h2 className="text-lg font-semibold text-gray-800">
                  OTP যাচাই
                </h2>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                {otpVia === "sms" ? "আপনার মোবাইলে" : "আপনার ইমেইলে"} ৬ সংখ্যার
                OTP পাঠানো হয়েছে।
              </p>
              <form onSubmit={handleReset} className="space-y-4">
                <input
                  type="text"
                  placeholder="৬ সংখ্যার OTP"
                  maxLength={6}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-center tracking-widest text-xl font-bold focus:outline-none focus:ring-2 focus:ring-green-500"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                />
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder="নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer"
                  >
                    {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={resetMutation.isPending}
                  className="w-full bg-green-600 text-white font-semibold py-3 rounded-xl disabled:bg-green-300 cursor-pointer"
                >
                  {resetMutation.isPending
                    ? "পরিবর্তন হচ্ছে..."
                    : "পাসওয়ার্ড পরিবর্তন করুন"}
                </button>
                <button
                  type="button"
                  onClick={() => handleForgot({ preventDefault: () => {} })}
                  className="w-full text-sm text-green-600 font-medium py-2 cursor-pointer"
                >
                  OTP আসেনি? আবার পাঠান
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          নতুন বাড়ীওয়ালা?{" "}
          <Link href="/subscribe" className="text-green-600 font-medium underline">
            সাবস্ক্রাইব করুন
          </Link>
        </p>
      </div>
    </div>
  );
}
