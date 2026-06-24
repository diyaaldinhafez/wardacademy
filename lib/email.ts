import "server-only";
import { Resend } from "resend";
import { DateTime } from "luxon";
import { getTranslations } from "next-intl/server";

const FROM = process.env.EMAIL_FROM ?? "Ward Academy <onboarding@resend.dev>";

let _resend: Resend | null = null;
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!_resend) _resend = new Resend(key);
  return _resend;
}

export type SendResult = { ok: boolean; skipped?: boolean; error?: string };

// Parent-facing comms render in the guardian's language (captured at registration);
// fall back to Arabic when it's absent (the audience is Arabic).
const norm = (locale?: string | null) => (locale === "en" ? "en" : "ar");

/** Send one email. No-ops gracefully (and logs) when RESEND_API_KEY is unset. */
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }): Promise<SendResult> {
  const resend = getResend();
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY missing — not sending: "${subject}" → ${to}`);
    return { ok: false, skipped: true };
  }
  try {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) return { ok: false, error: String((error as { message?: string }).message ?? error) };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send failed" };
  }
}

function layout(locale: string, brand: string, footer: string, heading: string, bodyHtml: string): string {
  const dir = locale === "ar" ? "rtl" : "ltr";
  return `<div dir="${dir}" lang="${locale}" style="font-family:'IBM Plex Sans Arabic',Tahoma,Arial,sans-serif;background:#F9F8FC;padding:24px;color:#221D33">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #E4E1EE;border-radius:16px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#9F7DE7,#6840BD);padding:20px 24px;color:#fff">
      <div style="font-weight:700;font-size:18px">${brand}</div>
    </div>
    <div style="padding:24px">
      <h1 style="font-size:18px;margin:0 0 12px">${heading}</h1>
      ${bodyHtml}
    </div>
    <div style="padding:16px 24px;border-top:1px solid #F1EFF7;color:#767093;font-size:12px">${footer}</div>
  </div>
</div>`;
}

/** Confirmation to the guardian that the free intro session is booked. */
export async function sendBookingConfirmation(opts: {
  to: string;
  guardianName: string;
  studentName: string;
  whenUTC: string;
  timezone: string;
  locale?: string | null;
}): Promise<SendResult> {
  const locale = norm(opts.locale);
  const t = await getTranslations({ locale, namespace: "comms" });
  const when = DateTime.fromISO(opts.whenUTC, { zone: "utc" }).setZone(opts.timezone).setLocale(locale).toFormat("cccc d LLLL yyyy — h:mm a");
  const html = layout(
    locale,
    t("brand"),
    t("footer"),
    t("email.booking.heading"),
    `<p style="margin:0 0 10px">${t("email.booking.greeting", { name: opts.guardianName })}</p>
     <p style="margin:0 0 10px">${t("email.booking.body", { student: `<strong>${opts.studentName}</strong>` })}</p>
     <div style="background:#F6F3FE;border:1px solid #EDE7FD;border-radius:12px;padding:14px;margin:0 0 12px;font-weight:700;color:#3D2371">📅 ${when}</div>
     <p style="margin:0 0 10px;color:#5E5778">${t("email.booking.note")}</p>
     <p style="margin:0;color:#5E5778">${t("email.booking.closing")}</p>`,
  );
  return sendEmail({ to: opts.to, subject: t("email.booking.subject"), html });
}

/** Send the guardian the warm intro-session report after the free session. */
export async function sendIntroReport(opts: {
  to: string;
  guardianName: string;
  studentName: string;
  body: string;
  locale?: string | null;
}): Promise<SendResult> {
  const locale = norm(opts.locale);
  const t = await getTranslations({ locale, namespace: "comms" });
  // The report body is teacher/AI-authored content — rendered as-is, never translated.
  const paragraphs = opts.body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 12px;line-height:1.9">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
  const html = layout(
    locale,
    t("brand"),
    t("footer"),
    t("email.intro.heading", { student: opts.studentName }),
    `<p style="margin:0 0 12px">${t("email.intro.greeting", { name: opts.guardianName })}</p>${paragraphs}`,
  );
  return sendEmail({ to: opts.to, subject: t("email.intro.subject", { student: opts.studentName }), html });
}

/** Send a guardian/student their account set-up (invite) link. */
export async function sendAccountInvite(opts: {
  to: string;
  name: string;
  role: "guardian" | "student";
  link: string;
  locale?: string | null;
}): Promise<SendResult> {
  const locale = norm(opts.locale);
  const t = await getTranslations({ locale, namespace: "comms" });
  const body = opts.role === "guardian" ? t("email.invite.bodyGuardian") : t("email.invite.bodyStudent");
  const html = layout(
    locale,
    t("brand"),
    t("footer"),
    t("email.invite.heading"),
    `<p style="margin:0 0 10px">${t("email.invite.greeting", { name: opts.name })}</p>
     <p style="margin:0 0 14px">${body}</p>
     <p style="margin:0 0 14px"><a href="${opts.link}" style="display:inline-block;background:#7F55D9;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px">${t("email.invite.button")}</a></p>
     <p style="margin:0;color:#767093;font-size:12px">${t("email.invite.fallbackNote")}<br><span style="direction:ltr;display:inline-block">${opts.link}</span></p>`,
  );
  return sendEmail({ to: opts.to, subject: t("email.invite.subject"), html });
}
