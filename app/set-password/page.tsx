"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import FlowerMark from "@/components/FlowerMark";
import LocaleSwitcher from "@/components/LocaleSwitcher";

export default function SetPasswordPage() {
  const supabase = createClient();
  const t = useTranslations("setPassword");
  const tc = useTranslations("common");
  const locale = useLocale();
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
    if (pw.length < 8) return setError(t("tooShort"));
    if (pw !== pw2) return setError(t("mismatch"));
    setPending(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setPending(false);
    if (error) return setError(error.message);
    setDone(true);
    setTimeout(() => (window.location.href = "/studio/login"), 1400);
  }

  return (
    <main dir={locale === "ar" ? "rtl" : "ltr"} lang={locale} style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--surface-page)", padding: 24, fontFamily: locale === "ar" ? "var(--font-ar)" : undefined }}>
      <div className="ward-card" style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <FlowerMark className="h-9 w-9" />
          <span style={{ fontWeight: 700, color: "var(--ward-purple-800)", flex: 1 }}>{tc("appName")}</span>
          <LocaleSwitcher />
        </div>

        {done ? (
          <p style={{ color: "var(--leaf-700)", fontWeight: 600 }}>{t("done")}</p>
        ) : hasSession === false ? (
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>{t("invalidLink")}</p>
        ) : (
          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-strong)" }}>{t("title")}</h1>
            <div className="ward-field">
              <label className="ward-field__label">{t("newPw")}</label>
              <input type="password" className="ward-field__control" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={8} autoComplete="new-password" />
            </div>
            <div className="ward-field">
              <label className="ward-field__label">{t("confirmPw")}</label>
              <input type="password" className="ward-field__control" value={pw2} onChange={(e) => setPw2(e.target.value)} required minLength={8} autoComplete="new-password" />
            </div>
            {error && <p style={{ color: "var(--danger-fg)", fontSize: 13 }}>{error}</p>}
            <button type="submit" disabled={pending || hasSession === null} className="ward-btn ward-btn--primary ward-btn--md ward-btn--full">
              {pending ? t("saving") : t("save")}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
