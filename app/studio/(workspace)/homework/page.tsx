import { createClient } from "@/lib/supabase/server";
import { ITEM_FORMATS, DIFFICULTIES, FORMAT_LABELS } from "@/lib/items";
import { SKILL_AR } from "@/lib/skills";
import { generateDraft, assignItem } from "@/app/studio/actions";
import SubmitButton from "@/components/studio/SubmitButton";
import ItemCard from "@/components/studio/ItemCard";
import { Card, Badge, AITrustBadge, Spark } from "@/components/ward/ui";

/* eslint-disable @typescript-eslint/no-explicit-any */
const btn = (v: string, s = "sm") => `ward-btn ward-btn--${v} ward-btn--${s}`;

export default async function HomeworkPage() {
  const supabase = await createClient();

  const { data: profile } = await supabase.from("profiles").select("roles").eq("id", (await supabase.auth.getUser()).data.user?.id ?? "").single();
  const isInstructor = ((profile?.roles as string[]) ?? []).includes("instructor");

  const { data: objectives } = await supabase.from("objectives").select("id, track, level, description, skill").order("created_at");
  const { data: items } = await supabase
    .from("items")
    .select("id, prompt, content, format, difficulty, status, item_keys(answer, explanation, rubric)")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  const { data: people } = await supabase.from("profiles").select("id, full_name, roles");
  const learners = (people ?? []).filter((p: any) => ((p.roles as string[]) ?? []).includes("learner"));
  const nameOf = new Map<string, string>();
  for (const l of learners) nameOf.set(l.id, (l.full_name as string) ?? l.id);

  const { data: assignments } = await supabase.from("assignments").select("item_id, learner_id");
  const assigneesByItem = new Map<string, string[]>();
  for (const a of (assignments ?? []) as any[]) {
    const arr = assigneesByItem.get(a.item_id) ?? [];
    arr.push(a.learner_id);
    assigneesByItem.set(a.item_id, arr);
  }

  const sel = "ward-select__control";

  return (
    <>
      {/* Objectives → generate */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-strong)" }}>الأهداف</h2>
          {isInstructor && <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-muted)" }}><Spark size={14} /> ولّد مسودّةً ثمّ راجِعها قبل الإرسال</span>}
        </div>
        {(objectives ?? []).map((o: any) => (
          <Card key={o.id} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Badge tone="neutral">{o.track?.toUpperCase()}{o.level ? ` · ${o.level}` : ""}</Badge>
              {o.skill && <Badge tone="brand">{SKILL_AR[o.skill as keyof typeof SKILL_AR] ?? o.skill}</Badge>}
              <span style={{ color: "var(--text-body)", flex: 1 }}>{o.description}</span>
            </div>
            {isInstructor && (
              <form action={generateDraft} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                <input type="hidden" name="objectiveId" value={o.id} />
                <select name="format" defaultValue="multiple_choice" className={sel} style={{ width: "auto", minHeight: 36 }}>
                  {ITEM_FORMATS.map((f) => <option key={f} value={f}>{FORMAT_LABELS[f]}</option>)}
                </select>
                <select name="difficulty" defaultValue="easy" className={sel} style={{ width: "auto", minHeight: 36 }}>
                  {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <SubmitButton pendingText="جارٍ التوليد…" className={btn("soft")}>ولّد مسودّة</SubmitButton>
              </form>
            )}
          </Card>
        ))}
      </section>

      {/* Approved items → assign */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-strong)" }}>الواجبات المعتمَدة</h2>
          <AITrustBadge status="approved" compact />
          <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{(items ?? []).length}</span>
        </div>
        {(items ?? []).length === 0 && <p style={{ fontSize: 14, color: "var(--text-muted)" }}>لا شيء معتمَدٌ بعد — اعتمِد مسودّةً من «مراجعات الذكاء».</p>}
        {(items ?? []).map((it: any) => {
          const assigned = assigneesByItem.get(it.id) ?? [];
          return (
            <div key={it.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <ItemCard it={it} right={<AITrustBadge status="approved" compact />} />
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", paddingInline: 4 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  مُسنَدٌ إلى: {assigned.length ? assigned.map((id) => nameOf.get(id) ?? id).join("، ") : "لا أحد بعد"}
                </span>
                {learners.length > 0 && (
                  <form action={assignItem} style={{ display: "flex", alignItems: "center", gap: 6, marginInlineStart: "auto" }}>
                    <input type="hidden" name="itemId" value={it.id} />
                    <select name="learnerId" defaultValue="" required className={sel} style={{ width: "auto", minHeight: 36 }}>
                      <option value="" disabled>اختر طالباً…</option>
                      {learners.map((l: any) => <option key={l.id} value={l.id}>{l.full_name ?? l.id}</option>)}
                    </select>
                    <SubmitButton pendingText="…" className={btn("secondary")}>أسنِد</SubmitButton>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}
