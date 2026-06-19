"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { adminLogout } from "@/app/admin/actions";
import { Avatar, Badge } from "@/components/ward/ui";
import FlowerMark from "@/components/FlowerMark";

const NAV = [
  { href: "/admin", label: "اللوحة", d: "M3 11l9-8 9 8M5 9v11h14V9" },
  { href: "/admin/registrations", label: "الطلبات", d: "M4 4h16v16H4zM4 9h16M9 4v5", badge: "leads" as const },
  { href: "/admin/students", label: "الطلاب", d: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM4 21v-1a6 6 0 0112 0v1" },
  { href: "/admin/availability", label: "المواعيد", d: "M7 3v3m10-3v3M4 8h16M5 6h14a1 1 0 011 1v12a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1z" },
];

function NavIcon({ d, size = 17 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
    <div className="app-shell" dir="rtl">
      {/* Desktop sidebar */}
      <aside className="app-sidebar">
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

      <div className="app-main">
        <div className="app-topbar">
          <Link href="/admin" className="only-mobile" style={{ alignItems: "center" }}>
            <FlowerMark className="h-8 w-8" />
          </Link>
          <h1 style={{ fontSize: 19, fontWeight: 700, flex: 1, color: "var(--text-strong)" }}>{title}</h1>
          <span className="only-desktop" style={{ fontSize: 13, color: "var(--text-muted)" }}>{today}</span>
        </div>
        <div className="app-content">{children}</div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="app-bottomnav" dir="rtl">
        {NAV.map((it) => {
          const active = isActive(it.href);
          const n = it.badge ? counts[it.badge] : 0;
          return (
            <Link key={it.href} href={it.href} className="app-bottomnav-item" style={{ color: active ? "var(--text-brand)" : "var(--text-muted)" }}>
              <NavIcon d={it.d} size={20} />
              {it.label}
              {it.badge && n > 0 && (
                <span style={{ position: "absolute", top: 2, insetInlineEnd: "26%", background: "var(--apricot-500)", color: "#fff", borderRadius: 999, fontSize: 9, minWidth: 14, height: 14, display: "grid", placeItems: "center", padding: "0 3px" }}>
                  {n}
                </span>
              )}
            </Link>
          );
        })}
        <form action={adminLogout} style={{ flex: 1, display: "flex" }}>
          <button className="app-bottomnav-item" style={{ color: "var(--text-muted)" }}>
            <NavIcon d="M16 17l5-5-5-5M21 12H9M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" size={20} />
            خروج
          </button>
        </form>
      </nav>
    </div>
  );
}
