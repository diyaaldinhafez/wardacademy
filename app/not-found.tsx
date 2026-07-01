import Link from "next/link";
import FlowerMark from "@/components/FlowerMark";

// Global 404 (§9(4)). Ward-branded, bilingual — Arabic first, then English. Both languages are
// HARDCODED (never keyed to the LOCALE cookie) so the page reads correctly for any visitor. Each
// text block owns its own dir so neither flips the other. Reuses the design system only (FlowerMark
// + purple/cream tokens + ward-card/ward-btn). No cookie/logic/data. Context-free by design.
export default function NotFound() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--surface-page)", padding: 24 }}>
      <div
        className="ward-card"
        style={{ width: "100%", maxWidth: 420, padding: 32, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}
      >
        <FlowerMark className="h-16 w-16" />

        {/* Arabic (primary) */}
        <div dir="rtl" style={{ fontFamily: "var(--font-ar)" }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--ward-purple-800)", margin: 0 }}>الصفحة غير موجودة</h1>
          <p style={{ fontSize: 14.5, color: "var(--text-muted)", margin: "8px 0 0", lineHeight: 1.7 }}>
            قد يكون الرابط قديمًا أو غير صحيح. لا بأس — عُد إلى الصفحة الرئيسية.
          </p>
        </div>

        {/* English (secondary) */}
        <div dir="ltr">
          <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text-strong)", margin: 0 }}>Page not found</p>
          <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: "6px 0 0", lineHeight: 1.6 }}>
            The link may be old or incorrect — let&apos;s get you back home.
          </p>
        </div>

        {/* One action → the (bilingual) landing page, a safe home for any visitor. */}
        <Link href="/" className="ward-btn ward-btn--primary ward-btn--md" style={{ marginTop: 4 }}>
          <span dir="rtl" style={{ fontFamily: "var(--font-ar)" }}>الصفحة الرئيسية</span>
          <span aria-hidden="true" style={{ opacity: 0.55 }}>·</span>
          <span dir="ltr">Back home</span>
        </Link>
      </div>
    </main>
  );
}
