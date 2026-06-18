import "server-only";
import { Resend } from "resend";
import { DateTime } from "luxon";

const FROM = process.env.EMAIL_FROM ?? "Ward Academy <onboarding@resend.dev>";

let _resend: Resend | null = null;
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!_resend) _resend = new Resend(key);
  return _resend;
}

export type SendResult = { ok: boolean; skipped?: boolean; error?: string };

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

function layout(heading: string, bodyHtml: string): string {
  return `<div dir="rtl" lang="ar" style="font-family:'IBM Plex Sans Arabic',Tahoma,Arial,sans-serif;background:#F9F8FC;padding:24px;color:#221D33">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #E4E1EE;border-radius:16px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#9F7DE7,#6840BD);padding:20px 24px;color:#fff">
      <div style="font-weight:700;font-size:18px">أكاديمية وَرد</div>
    </div>
    <div style="padding:24px">
      <h1 style="font-size:18px;margin:0 0 12px">${heading}</h1>
      ${bodyHtml}
    </div>
    <div style="padding:16px 24px;border-top:1px solid #F1EFF7;color:#767093;font-size:12px">أكاديمية وَرد · تعلّمٌ ممتعٌ للإنجليزية</div>
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
}): Promise<SendResult> {
  const when = DateTime.fromISO(opts.whenUTC, { zone: "utc" }).setZone(opts.timezone).setLocale("ar").toFormat("cccc d LLLL yyyy — h:mm a");
  const html = layout(
    "تأكيد حجز الجلسة التعريفية المجانية",
    `<p style="margin:0 0 10px">مرحباً ${opts.guardianName}،</p>
     <p style="margin:0 0 10px">تمّ تأكيد حجز الجلسة التعريفية المجانية للطالب <strong>${opts.studentName}</strong>:</p>
     <div style="background:#F6F3FE;border:1px solid #EDE7FD;border-radius:12px;padding:14px;margin:0 0 12px;font-weight:700;color:#3D2371">📅 ${when}</div>
     <p style="margin:0 0 10px;color:#5E5778">سنرسل لك اختبار تحديد المستوى قبل الجلسة عبر واتساب. إن رغبت بتغيير الموعد، تواصل معنا.</p>
     <p style="margin:0;color:#5E5778">بالتوفيق! 🌸</p>`,
  );
  return sendEmail({ to: opts.to, subject: "تأكيد حجز الجلسة التعريفية — أكاديمية وَرد", html });
}

/** Send a guardian/student their account set-up (invite) link. */
export async function sendAccountInvite(opts: {
  to: string;
  name: string;
  role: "guardian" | "student";
  link: string;
}): Promise<SendResult> {
  const who = opts.role === "guardian" ? "وليّ الأمر" : "الطالب";
  const html = layout(
    "حسابك في أكاديمية وَرد جاهز",
    `<p style="margin:0 0 10px">مرحباً ${opts.name}،</p>
     <p style="margin:0 0 14px">أُنشئ حساب ${who} على منصّة أكاديمية وَرد. اضغط الزرّ لتعيين كلمة المرور والدخول:</p>
     <p style="margin:0 0 14px"><a href="${opts.link}" style="display:inline-block;background:#7F55D9;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px">تعيين كلمة المرور والدخول</a></p>
     <p style="margin:0;color:#767093;font-size:12px">إن لم يعمل الزرّ، انسخ هذا الرابط:<br><span style="direction:ltr;display:inline-block">${opts.link}</span></p>`,
  );
  return sendEmail({ to: opts.to, subject: "حسابك جاهز — أكاديمية وَرد", html });
}
