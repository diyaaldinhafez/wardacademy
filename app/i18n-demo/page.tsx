import { getTranslations, getLocale } from "next-intl/server";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import DemoClientGreeting from "./DemoClientGreeting";

// Infrastructure proof surface (temporary — removed once real surfaces migrate).
// Renders the same test key from a SERVER Component and a CLIENT Component, plus
// the switcher. Flipping EN/ع sets the LOCALE cookie and re-renders both.
export default async function I18nDemoPage() {
  const t = await getTranslations("demo");
  const locale = await getLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";
  return (
    <main dir={dir} style={{ maxWidth: 560, margin: "0 auto", padding: "48px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-strong)" }}>{t("title")}</h1>
        <LocaleSwitcher />
      </div>
      <p style={{ fontSize: 15, color: "var(--text-body)" }}>
        <strong>[server]</strong> {t("greeting")}
      </p>
      <DemoClientGreeting />
      <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
        {t("localeLabel")}: <strong dir="ltr">{locale}</strong> · dir=<strong dir="ltr">{dir}</strong>
      </p>
      <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{t("switchHint")}</p>
    </main>
  );
}
