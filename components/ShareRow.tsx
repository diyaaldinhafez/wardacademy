"use client";

import { useState } from "react";
import Icon from "./Icon";

type Labels = { copy: string; copied: string; whatsapp: string };

/**
 * Copy-link + Share-on-WhatsApp buttons. Visual sharing only — the link is a
 * plain URL (no stored data). Relative urls ("/placement?…") are resolved to
 * absolute at click time. Styled in brand colors (not WhatsApp green) to keep
 * the palette, with the WhatsApp label so it's still clear.
 */
export default function ShareRow({
  url,
  message,
  labels,
  compact = false,
}: {
  url: string;
  message: string;
  labels: Labels;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  function resolve() {
    if (url.startsWith("/") && typeof window !== "undefined") {
      return window.location.origin + url;
    }
    return url;
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(resolve());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable — no-op for the prototype */
    }
  }

  function shareWhatsApp() {
    const href = `https://wa.me/?text=${encodeURIComponent(message + resolve())}`;
    window.open(href, "_blank", "noopener,noreferrer");
  }

  const btn = compact ? "px-3 py-2 text-xs" : "px-5 py-3 text-sm sm:flex-1";

  return (
    <div className={compact ? "flex flex-wrap gap-2" : "flex flex-col gap-2 sm:flex-row"}>
      <button
        type="button"
        onClick={copy}
        className={`inline-flex items-center justify-center gap-2 rounded-full border border-ink/15 bg-white font-semibold text-ink transition-colors hover:border-brand/40 hover:text-brand ${btn}`}
      >
        <Icon name={copied ? "check" : "link"} className="h-4 w-4" />
        {copied ? labels.copied : labels.copy}
      </button>
      <button
        type="button"
        onClick={shareWhatsApp}
        className={`brand-gradient inline-flex items-center justify-center gap-2 rounded-full font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 ${btn}`}
      >
        <Icon name="chat" className="h-4 w-4" />
        {labels.whatsapp}
      </button>
    </div>
  );
}
