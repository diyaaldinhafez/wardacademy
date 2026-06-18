"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { logout } from "@/app/studio/actions";
import { Avatar, Badge } from "@/components/ward/ui";
import FlowerMark from "@/components/FlowerMark";

const NAV = [
  { href: "/studio", label: "اليوم", d: "M3 11l9-8 9 8M5 9v11h14V9" },
  { href: "/studio/reviews", label: "مراجعات الذكاء", d: "M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z", badge: "reviews" as const },
  { href: "/studio/students", label: "الطلاب", d: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM4 21v-1a6 6 0 0112 0v1" },
  { href: "/studio/homework", label: "الواجبات", d: "M9 3h6l5 5v13H4V3h5zM9 13h6M9 17h4" },
  { href: "/studio/reports", label: "تقارير الجلسات", d: "M4 19V5m0 14h16M8 15v-4m4 4V8m4 7v-6" },
  { href: "/studio/leads", label: "طلبات التسجيل", d: "M4 4h16v16H4zM4 9h16M9 4v5", badge: "leads" as const },
];

function NavIcon({ d }: { d: string }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export default function TeacherShell({
  teacherName,
  today,
  reviewsCount = 0,
  leadsCount = 0,
  children,
}: {
  teacherName: string;
  today: string;
  reviewsCount?: number;
  leadsCount?: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/studio" ? pathname === "/studio" : pathname.startsWith(href));
  const title = NAV.find((n) => isActive(n.href))?.label ?? "استوديو المعلّم";
  const counts: Record<string, number> = { reviews: reviewsCount, leads: leadsCount };

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
        <Link href="/studio" style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px 18px", textDecoration: "none" }}>
          <FlowerMark className="h-9 w-9 shrink-0" />
          <span style={{ fontWeight: 700, fontSize: 16, color: "var(--ward-purple-800)" }}>أكاديمية وَرد</span>
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
              {it.badge && n > 0 ? <span style={{ marginInlineStart: "auto" }}><Badge tone={it.badge === "reviews" ? "brand" : "apricot"}>{n}</Badge></span> : null}
            </Link>
          );
        })}
        <div style={{ marginBlockStart: "auto", display: "flex", alignItems: "center", gap: 10, padding: "12px 8px 4px", borderBlockStart: "1px solid var(--border-soft)" }}>
          <Avatar name={teacherName} size={34} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-body)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {teacherName}
          </span>
        </div>
        <form action={logout}>
          <button
            className="ward-btn ward-btn--ghost ward-btn--sm ward-btn--full"
            style={{ justifyContent: "flex-start", color: "var(--text-muted)" }}
          >
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
