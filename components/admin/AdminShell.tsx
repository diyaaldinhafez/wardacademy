"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { adminLogout } from "@/app/admin/actions";
import { Avatar, Badge } from "@/components/ward/ui";
import FlowerMark from "@/components/FlowerMark";

const NAV = [
  { href: "/admin", label: "اللوحة", d: "M3 11l9-8 9 8M5 9v11h14V9" },
  { href: "/admin/registrations", label: "طلبات التسجيل", d: "M4 4h16v16H4zM4 9h16M9 4v5", badge: "leads" as const },
  // المواعيد + اختبارات التحديد تُضاف في المراحل التالية
];

function NavIcon({ d }: { d: string }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export default function AdminShell({
  adminName,
  today,
  leadsCount = 0,
  children,
}: {
  adminName: string;
  today: string;
  leadsCount?: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  const title = NAV.find((n) => isActive(n.href))?.label ?? "الإدارة";
  const counts: Record<string, number> = { leads: leadsCount };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--surface-page)", fontFamily: "var(--font-ar)" }} dir="rtl">
      <aside
        style={{
          width: 224,
          flexShrink: 0,
          background: "var(--surface-card)",
          borderInlineEnd: "1px solid var(--border-soft)",
          padding: "20px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          position: "sticky",
          top: 0,
          alignSelf: "flex-start",
          height: "100vh",
        }}
      >
        <Link href="/admin" style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px 14px", textDecoration: "none" }}>
          <FlowerMark className="h-9 w-9 shrink-0" />
          <span style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--ward-purple-800)" }}>أكاديمية وَرد</span>
            <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>الإدارة والتشغيل</span>
          </span>
        </Link>
        {NAV.map((it) => {
          const active = isActive(it.href);
          const n = it.badge ? counts[it.badge] : 0;
          return (
            <Link
              key={it.href}
              href={it.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
                background: active ? "var(--brand-soft)" : "transparent",
                color: active ? "var(--text-on-soft)" : "var(--text-muted)",
              }}
            >
              <NavIcon d={it.d} />
              {it.label}
              {it.badge && n > 0 ? <span style={{ marginInlineStart: "auto" }}><Badge tone="apricot">{n}</Badge></span> : null}
            </Link>
          );
        })}
        <div style={{ marginBlockStart: "auto", display: "flex", alignItems: "center", gap: 10, padding: "12px 8px 4px", borderBlockStart: "1px solid var(--border-soft)" }}>
          <Avatar name={adminName} size={34} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-body)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {adminName}
          </span>
        </div>
        <form action={adminLogout}>
          <button className="ward-btn ward-btn--ghost ward-btn--sm ward-btn--full" style={{ justifyContent: "flex-start", color: "var(--text-muted)" }}>
            تسجيل الخروج
          </button>
        </form>
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 28px", background: "var(--surface-card)", borderBlockEnd: "1px solid var(--border-soft)" }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, flex: 1, color: "var(--text-strong)" }}>{title}</h1>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{today}</span>
        </div>
        <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 20 }}>{children}</div>
      </div>
    </div>
  );
}
