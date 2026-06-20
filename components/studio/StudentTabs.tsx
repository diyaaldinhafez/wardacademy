"use client";

import { useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

export type StudentTab = { key: string; label: string; badge?: number; content: ReactNode };

/** Segmented tabs for the student detail page. Horizontally scrollable on phones. Opens on ?tab=<key> if present. */
export default function StudentTabs({ tabs }: { tabs: StudentTab[] }) {
  const wanted = useSearchParams().get("tab");
  const [active, setActive] = useState(tabs.some((t) => t.key === wanted) ? wanted! : tabs[0]?.key);
  const current = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        role="tablist"
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          padding: 4,
          background: "var(--surface-sunken)",
          borderRadius: 14,
          scrollbarWidth: "none",
        }}
      >
        {tabs.map((t) => {
          const on = t.key === current?.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={on}
              onClick={() => setActive(t.key)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                whiteSpace: "nowrap",
                flexShrink: 0,
                padding: "8px 14px",
                borderRadius: 10,
                fontSize: 13.5,
                fontWeight: 600,
                cursor: "pointer",
                border: "none",
                background: on ? "var(--surface-card)" : "transparent",
                color: on ? "var(--brand)" : "var(--text-muted)",
                boxShadow: on ? "0 1px 3px rgba(16,12,40,.08)" : "none",
              }}
            >
              {t.label}
              {t.badge ? (
                <span
                  style={{
                    minWidth: 18,
                    height: 18,
                    padding: "0 5px",
                    borderRadius: 999,
                    background: "var(--apricot, #f6b26b)",
                    color: "#3a2a12",
                    fontSize: 11,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {t.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div role="tabpanel">{current?.content}</div>
    </div>
  );
}
