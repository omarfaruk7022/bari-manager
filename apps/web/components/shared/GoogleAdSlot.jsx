"use client";

import { useEffect } from "react";
import Script from "next/script";

export function GoogleAdSlot({ clientId, slotId, layout = "default" }) {
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch {}
  }, [clientId, slotId, layout]);

  if (!clientId || !slotId) return null;

  return (
    <div className="rounded-lg border border-amber-100 bg-white p-3 shadow-sm">
      <Script
        id="google-adsense-script"
        async
        strategy="afterInteractive"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
        crossOrigin="anonymous"
      />
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
        Sponsored
      </p>
      <ins
        className="adsbygoogle block min-h-[90px] w-full overflow-hidden rounded-md bg-amber-50"
        style={{ display: "block" }}
        data-ad-client={clientId}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
        data-ad-layout={layout}
      />
    </div>
  );
}
