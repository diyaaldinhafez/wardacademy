"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePlan } from "@/app/studio/actions";

type Lesson = { id: string; description: string; skill: string; level: string };
type Unit = { name: string; lessons: Lesson[] };
type Item = { id?: string; description?: string; skill?: string | null; level?: string | null; unit?: string | null };

const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
const ctl = "ward-field__control";
const sel = "ward-select__control";
const btn = (v: string, s = "sm") => `ward-btn ward-btn--${v} ward-btn--${s}`;

function group(items: Item[]): Unit[] {
  const groups: Unit[] = [];
  for (const it of items) {
    const name = (it.unit as string) || "الوحدة 1";
    let g = groups[groups.length - 1];
    if (!g || g.name !== name) { g = { name, lessons: [] }; groups.push(g); }
    g.lessons.push({ id: it.id || uid(), description: it.description ?? "", skill: it.skill ?? "", level: it.level ?? "" });
  }
  if (groups.length === 0) groups.push({ name: "الوحدة 1", lessons: [] });
  return groups;
}

const move = <T,>(arr: T[], i: number, dir: -1 | 1): T[] => {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const next = arr.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
};

export default function PlanBuilder({ planId, learnerId, title: initTitle, items, skills }: {
  planId: string; learnerId: string; title: string; items: Item[]; skills: { value: string; label: string }[];
}) {
  const [title, setTitle] = useState(initTitle);
  const [units, setUnits] = useState<Unit[]>(() => group(items));
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  const setUnit = (ui: number, fn: (u: Unit) => Unit) => setUnits((us) => us.map((u, i) => (i === ui ? fn(u) : u)));
  const setLesson = (ui: number, li: number, field: keyof Lesson, val: string) =>
    setUnit(ui, (u) => ({ ...u, lessons: u.lessons.map((l, i) => (i === li ? { ...l, [field]: val } : l)) }));

  function save() {
    setSaved(false);
    const flat = units.flatMap((u) =>
      u.lessons.filter((l) => l.description.trim()).map((l) => ({ id: l.id, description: l.description.trim(), level: l.level.trim() || null, skill: l.skill || null, unit: u.name.trim() || "وحدة" })),
    );
    const fd = new FormData();
    fd.set("planId", planId);
    fd.set("learnerId", learnerId);
    fd.set("title", title);
    fd.set("items", JSON.stringify(flat));
    start(async () => {
      await savePlan(fd);
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان الخطّة/المنهاج" className={ctl} style={{ fontWeight: 700 }} />

      {units.map((u, ui) => (
        <div key={ui} style={{ borderRadius: 12, border: "1px solid var(--border-soft)", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", background: "var(--surface-soft)", borderBottom: "1px solid var(--ink-100)" }}>
            <input value={u.name} onChange={(e) => setUnit(ui, (x) => ({ ...x, name: e.target.value }))} placeholder="اسم الوحدة" className={ctl} style={{ flex: 1, fontWeight: 700, color: "var(--brand)" }} />
            <button type="button" onClick={() => setUnits((us) => move(us, ui, -1))} className={btn("ghost")} title="أعلى">↑</button>
            <button type="button" onClick={() => setUnits((us) => move(us, ui, 1))} className={btn("ghost")} title="أسفل">↓</button>
            <button type="button" onClick={() => setUnits((us) => us.filter((_, i) => i !== ui))} className={btn("ghost")} title="حذف الوحدة">🗑</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: 10 }}>
            {u.lessons.map((l, li) => {
              const num = units.slice(0, ui).reduce((s, x) => s + x.lessons.length, 0) + li + 1;
              return (
                <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ width: 20, flexShrink: 0, fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textAlign: "center" }}>{num}</span>
                  <input value={l.description} onChange={(e) => setLesson(ui, li, "description", e.target.value)} placeholder="عنوان/وصف الدرس" className={ctl} style={{ flex: 1, minWidth: 150 }} />
                  <select value={l.skill} onChange={(e) => setLesson(ui, li, "skill", e.target.value)} className={sel} style={{ width: "auto", minHeight: 36, fontSize: 12.5 }}>
                    <option value="">المهارة…</option>
                    {skills.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <input value={l.level} onChange={(e) => setLesson(ui, li, "level", e.target.value)} placeholder="المستوى" className={ctl} style={{ width: 80 }} />
                  <button type="button" onClick={() => setUnit(ui, (x) => ({ ...x, lessons: move(x.lessons, li, -1) }))} className={btn("ghost")}>↑</button>
                  <button type="button" onClick={() => setUnit(ui, (x) => ({ ...x, lessons: move(x.lessons, li, 1) }))} className={btn("ghost")}>↓</button>
                  <button type="button" onClick={() => setUnit(ui, (x) => ({ ...x, lessons: x.lessons.filter((_, i) => i !== li) }))} className={btn("ghost")}>✕</button>
                </div>
              );
            })}
            <button type="button" onClick={() => setUnit(ui, (x) => ({ ...x, lessons: [...x.lessons, { id: uid(), description: "", skill: "", level: "" }] }))} className={btn("ghost")} style={{ alignSelf: "flex-start", color: "var(--brand)" }}>+ أضِف درساً</button>
          </div>
        </div>
      ))}

      <button type="button" onClick={() => setUnits((us) => [...us, { name: `الوحدة ${us.length + 1}`, lessons: [] }])} className={btn("ghost")} style={{ alignSelf: "flex-start", color: "var(--brand)", fontWeight: 600 }}>+ أضِف وحدة</button>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button type="button" onClick={save} disabled={pending} className={btn("secondary", "md")}>{pending ? "جارٍ الحفظ…" : "احفظ الخطّة"}</button>
        {saved && !pending && <span style={{ fontSize: 12.5, color: "var(--leaf-700)" }}>حُفِظت ✓</span>}
      </div>
    </div>
  );
}
