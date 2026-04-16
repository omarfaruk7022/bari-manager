"use client";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export function LangSwitcher() {
  const router = useRouter();
  const [lang, setLang] = useState("bn");

  useEffect(() => {
    const stored = localStorage.getItem("bm_lang") || "bn";
    setLang(stored);
    document.documentElement.lang = stored;
  }, []);

  const toggle = () => {
    const next = lang === "bn" ? "en" : "bn";
    setLang(next);
    localStorage.setItem("bm_lang", next);
    document.documentElement.lang = next;
    // Persist to user account if logged in
    const token = localStorage.getItem("bm_token");
    if (token) {
      import("@/lib/api").then(({ default: api }) => {
        api.put("/auth/language", { language: next }).catch(() => {});
      });
    }
    router.refresh();
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
      title="ভাষা পরিবর্তন"
    >
      <span className="text-base">{lang === "bn" ? "🇧🇩" : "🇬🇧"}</span>
      <span>{lang === "bn" ? "বাং" : "EN"}</span>
    </button>
  );
}
