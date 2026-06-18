"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import FlowerMark from "@/components/FlowerMark";

export default function SetPasswordPage() {
  const supabase = createClient();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    // createBrowserClient (detectSessionInUrl) parses the recovery link hash.
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) setHasSession(true);
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (pw.length < 8) return setError("كلمة المرور 8 أحرفٍ على الأقلّ.");
    if (pw !== pw2) return setError("كلمتا المرور غير متطابقتين.");
    setPending(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setPending(false);
    if (error) return setError(error.message);
    setDone(true);
    setTimeout(() => (window.location.href = "/studio/login"), 1400);
  }

  return (
    <main dir="rtl" lang="ar" style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--surface-page)", padding: 24, fontFamily: "var(--font-ar)" }}>
      <div className="ward-card" style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <FlowerMark className="h-9 w-9" />
          <span style={{ fontWeight: 700, color: "var(--ward-purple-800)" }}>أكاديمية وَرد</span>
        </div>

        {done ? (
          <p style={{ color: "var(--leaf-700)", fontWeight: 600 }}>تمّ تعيين كلمة المرور ✓ نُحوّلك لتسجيل الدخول…</p>
        ) : hasSession === false ? (
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            هذا الرابط غير صالحٍ أو منتهٍ. اطلب من الإدارة إرسال رابطٍ جديد.
          </p>
        ) : (
          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-strong)" }}>تعيين كلمة المرور</h1>
            <div className="ward-field">
              <label className="ward-field__label">كلمة المرور الجديدة</label>
              <input type="password" className="ward-field__control" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={8} autoComplete="new-password" />
            </div>
            <div className="ward-field">
              <label className="ward-field__label">تأكيد كلمة المرور</label>
              <input type="password" className="ward-field__control" value={pw2} onChange={(e) => setPw2(e.target.value)} required minLength={8} autoComplete="new-password" />
            </div>
            {error && <p style={{ color: "var(--danger-fg)", fontSize: 13 }}>{error}</p>}
            <button type="submit" disabled={pending || hasSession === null} className="ward-btn ward-btn--primary ward-btn--md ward-btn--full">
              {pending ? "جارٍ الحفظ…" : "حفظ والدخول"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
