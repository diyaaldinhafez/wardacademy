import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ward/ui";
import { SKILL_EN, type Skill } from "@/lib/skills";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Standalone, student-independent browser of the frozen Ward Curriculum. Reads the SAME
// catalog the Plan tab aggregates (curriculum_units / curriculum_objectives) — no duplicate
// data model. Each objective opens an (intentionally empty) lesson slot: the CONTAINER a
// future slide-based visual lesson drops into. Forced-English internal surface, mobile-first,
// screen-share friendly (one clear focal area per view). NO lesson content is built here.

const LEVELS = ["A1", "A2", "B1"] as const;
const SKILL_TONE: Record<string, "info" | "apricot" | "success" | "brand"> = {
  listening: "info",
  speaking: "apricot",
  reading: "success",
  writing: "brand",
};

const chip = (active: boolean) =>
  ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 16px",
    borderRadius: 999,
    fontSize: 14,
    fontWeight: 700,
    textDecoration: "none",
    border: active ? "1.5px solid var(--brand)" : "1.5px solid var(--border-soft)",
    background: active ? "var(--brand-soft)" : "var(--surface-card)",
    color: active ? "var(--text-on-soft)" : "var(--text-muted)",
  }) as const;

export default async function CurriculumPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; objective?: string }>;
}) {
  const { level: levelParam, objective: objectiveParam } = await searchParams;
  const supabase = await createClient();
  const t = await getTranslations({ locale: "en", namespace: "studio.curriculum" });

  const [{ data: unitsRaw }, { data: objRaw }] = await Promise.all([
    supabase.from("curriculum_units").select("unit_id, level, unit_number, title_en, title_ar").order("level").order("unit_number"),
    supabase
      .from("curriculum_objectives")
      .select("objective_id, unit_id, unit_number, seq, skill, level, cefr_level, descriptor_en, descriptor_ar")
      .order("unit_number", { ascending: true })
      .order("seq", { ascending: true })
      .order("objective_id", { ascending: true }),
  ]);
  const units = (unitsRaw ?? []) as any[];
  const objectives = (objRaw ?? []) as any[];

  const objByUnit = new Map<string, any[]>();
  for (const o of objectives) {
    if (!objByUnit.has(o.unit_id)) objByUnit.set(o.unit_id, []);
    objByUnit.get(o.unit_id)!.push(o);
  }
  const unitTitle = (u: any) => u?.title_en ?? u?.title_ar ?? u?.unit_id ?? "";
  const objDesc = (o: any) => o?.descriptor_en ?? o?.descriptor_ar ?? o?.objective_id ?? "";
  const skillLabel = (s: string) => SKILL_EN[s as Skill] ?? s;

  if (units.length === 0) {
    return <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{t("empty")}</p>;
  }

  // ——— DETAIL VIEW: the (empty) lesson slot for one objective ———
  const detail = objectiveParam ? objectives.find((o) => o.objective_id === objectiveParam) : null;
  if (detail) {
    const u = units.find((x) => x.unit_id === detail.unit_id);
    const backHref = `/studio/curriculum?level=${detail.level}`;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 900 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 13, color: "var(--text-muted)" }}>
          <Link href={backHref} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-brand)", fontWeight: 600, textDecoration: "none" }}>
            ← {t("back")}
          </Link>
          <span>·</span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            {detail.level} · {t("unit", { n: detail.unit_number })} · {unitTitle(u)}
          </span>
        </div>

        {/* Objective header */}
        <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Badge tone={SKILL_TONE[detail.skill] ?? "neutral"}>{skillLabel(detail.skill)}</Badge>
            <Badge tone="neutral">{t("cefr", { level: detail.cefr_level })}</Badge>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{detail.objective_id}</span>
          </div>
          <p style={{ fontSize: 18, fontWeight: 700, color: "var(--text-strong)", lineHeight: 1.4, margin: 0 }} dir="auto">
            {objDesc(detail)}
          </p>
        </Card>

        {/* The lesson slot — intentionally EMPTY. A future slide lesson (16:9) drops in here. */}
        <div
          style={{
            width: "100%",
            aspectRatio: "16 / 9",
            minHeight: 260,
            borderRadius: 16,
            border: "2px dashed var(--border-soft)",
            background: "linear-gradient(180deg, var(--surface-soft, #faf8ff), var(--surface-card))",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            textAlign: "center",
            padding: 24,
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.7">
            <rect x="3" y="4" width="18" height="13" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </svg>
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-strong)" }}>{t("lessonSlotTitle")}</span>
          <span style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 420 }}>{t("lessonSlotBlurb")}</span>
        </div>
      </div>
    );
  }

  // ——— BROWSE VIEW: level → units → objectives ———
  const level = (LEVELS as readonly string[]).includes(levelParam ?? "") ? (levelParam as string) : "A1";
  const levelUnits = units.filter((u) => u.level === level);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0 }}>{t("subtitle")}</p>

      {/* Level selector */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {LEVELS.map((lv) => {
          const n = units.filter((u) => u.level === lv).length;
          return (
            <Link key={lv} href={`/studio/curriculum?level=${lv}`} style={chip(lv === level)}>
              {lv}
              <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.7 }}>{t("unitsCount", { n })}</span>
            </Link>
          );
        })}
      </div>

      {/* Units (collapsible) → objectives */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {levelUnits.map((u, i) => {
          const objs = objByUnit.get(u.unit_id) ?? [];
          return (
            <Card key={u.unit_id} style={{ padding: 0, overflow: "hidden" }}>
              <details open={i === 0}>
                <summary
                  style={{
                    cursor: "pointer",
                    listStyle: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 16px",
                  }}
                >
                  <Badge tone="brand">{t("unit", { n: u.unit_number })}</Badge>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700, color: "var(--text-strong)" }} dir="auto">
                    {unitTitle(u)}
                  </span>
                  <span style={{ fontSize: 12.5, color: "var(--text-muted)", flexShrink: 0 }}>{t("objectivesCount", { n: objs.length })}</span>
                </summary>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 16px 16px" }}>
                  {objs.map((o) => (
                    <Link
                      key={o.objective_id}
                      href={`/studio/curriculum?level=${level}&objective=${o.objective_id}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid var(--ink-100)",
                        background: "var(--surface-card)",
                        textDecoration: "none",
                      }}
                    >
                      <Badge tone={SKILL_TONE[o.skill] ?? "neutral"}>{skillLabel(o.skill)}</Badge>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: "var(--text-body)", lineHeight: 1.4 }} dir="auto">
                        {objDesc(o)}
                      </span>
                      <span style={{ fontSize: 11.5, color: "var(--text-muted)", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{t("cefr", { level: o.cefr_level })}</span>
                      <span style={{ fontSize: 14, color: "var(--brand)", fontWeight: 700, flexShrink: 0 }}>→</span>
                    </Link>
                  ))}
                </div>
              </details>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
