import type {
  ReactNode,
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
} from "react";
import Link from "next/link";
import { Spark } from "./Spark";
export { Spark } from "./Spark";

/* ---- Card ---- */
export function Card({
  variant = "default",
  interactive,
  className = "",
  children,
  ...rest
}: { variant?: "default" | "soft" | "flat" | "child"; interactive?: boolean } & HTMLAttributes<HTMLDivElement>) {
  const cls = ["ward-card", variant !== "default" ? `ward-card--${variant}` : "", interactive ? "ward-card--interactive" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}

/* ---- Badge ---- */
export function Badge({
  tone = "brand",
  className = "",
  children,
  ...rest
}: { tone?: "brand" | "neutral" | "success" | "warning" | "danger" | "info" | "apricot" } & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={`ward-badge ward-badge--${tone} ${className}`} {...rest}>
      {children}
    </span>
  );
}

/* ---- Button (links + non-form actions; form submits use SubmitButton with these classes) ---- */
type BtnVariant = "primary" | "secondary" | "soft" | "ghost" | "danger" | "success" | "warm";
type BtnSize = "sm" | "md" | "lg";
function btnClass(variant: BtnVariant, size: BtnSize, fullWidth?: boolean, extra = "") {
  return ["ward-btn", `ward-btn--${variant}`, `ward-btn--${size}`, fullWidth ? "ward-btn--full" : "", extra].filter(Boolean).join(" ");
}
export function Button({
  variant = "primary",
  size = "md",
  href,
  icon,
  fullWidth,
  className = "",
  children,
  ...rest
}: {
  variant?: BtnVariant;
  size?: BtnSize;
  href?: string;
  icon?: ReactNode;
  fullWidth?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = btnClass(variant, size, fullWidth, className);
  const inner = (
    <>
      {icon ? (
        <span style={{ display: "inline-flex", flexShrink: 0 }} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} {...rest}>
      {inner}
    </button>
  );
}
export const wardBtn = btnClass; // helper for SubmitButton className

/* ---- Avatar ---- */
const AVATAR_PALETTES: [string, string][] = [
  ["#EDE7FD", "#533099"],
  ["#DDF3E7", "#1E7A50"],
  ["#FFEEDC", "#C97A2B"],
  ["#E3EEFA", "#2F6BB0"],
  ["#FBE3E9", "#B23A56"],
  ["#DCD0FA", "#3D2371"],
];
function avatarHash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}
export function Avatar({ name = "", size = 40 }: { name?: string; size?: number }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("");
  const [bg, fg] = AVATAR_PALETTES[avatarHash(name) % AVATAR_PALETTES.length];
  return (
    <span className="ward-avatar" title={name} style={{ width: size, height: size, fontSize: size * 0.38, background: bg, color: fg }}>
      {initials}
    </span>
  );
}

/* ---- AI trust badge ---- */
const TRUST_LABELS = {
  ar: { draft: "مسودّة ذكاء — بانتظار اعتماد المعلّم", approved: "اعتمدها المعلّم" },
  en: { draft: "AI draft — awaiting teacher approval", approved: "Teacher-approved" },
};
export function AITrustBadge({
  status = "draft",
  lang = "ar",
  label,
  compact = false,
}: {
  status?: "draft" | "approved";
  lang?: "ar" | "en";
  label?: string;
  compact?: boolean;
}) {
  const text = label || TRUST_LABELS[lang][status];
  return (
    <span className={`ward-trust ward-trust--${status}`}>
      {status === "draft" ? (
        <Spark size={13} />
      ) : (
        <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true">
          <path d="M2.5 7l3 3 5-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {compact ? null : text}
    </span>
  );
}

/* ---- Field (input / textarea) ---- */
export function Field({
  label,
  hint,
  multiline,
  className = "",
  ...rest
}: { label?: string; hint?: string; multiline?: boolean } & InputHTMLAttributes<HTMLInputElement> &
  TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className={`ward-field ${className}`}>
      {label ? <label className="ward-field__label">{label}</label> : null}
      {multiline ? (
        <textarea className="ward-field__control" {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)} />
      ) : (
        <input className="ward-field__control" {...(rest as InputHTMLAttributes<HTMLInputElement>)} />
      )}
      {hint ? <span className="ward-field__hint">{hint}</span> : null}
    </div>
  );
}

/* ---- Select ---- */
export function Select({
  label,
  children,
  className = "",
  ...rest
}: { label?: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={`ward-select ${className}`}>
      {label ? <label className="ward-select__label">{label}</label> : null}
      <div className="ward-select__wrap">
        <select className="ward-select__control" {...rest}>
          {children}
        </select>
        <span className="ward-select__chev" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path d="M3 5l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </div>
  );
}
