// Read-only view of a study plan (units → lessons). The plan is aggregated
// deterministically from the Ward Curriculum (startPlanFromCatalog) — there is no
// authoring here; this only displays study_plans.items.

type Item = { id?: string; description?: string; skill?: string | null; level?: string | null; unit?: string | null };
type Lesson = { id: string; description: string; skill: string; level: string };
type Unit = { name: string; lessons: Lesson[] };

function group(items: Item[]): Unit[] {
  const groups: Unit[] = [];
  for (const it of items) {
    const name = (it.unit as string) || "Unit 1";
    let g = groups[groups.length - 1];
    if (!g || g.name !== name) { g = { name, lessons: [] }; groups.push(g); }
    g.lessons.push({ id: it.id || String(groups.length), description: it.description ?? "", skill: it.skill ?? "", level: it.level ?? "" });
  }
  return groups;
}

export default function PlanView({ title, items, skills }: {
  title: string; items: Item[]; skills: { value: string; label: string }[];
}) {
  const units = group(items);
  const skillLabel = (v: string) => skills.find((s) => s.value === v)?.label ?? v;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontWeight: 700, color: "var(--text-strong)" }}>{title}</p>
      {units.map((u, ui) => (
        <div key={ui} style={{ borderRadius: 12, border: "1px solid var(--border-soft)", overflow: "hidden" }}>
          <div dir="auto" style={{ padding: "8px 10px", background: "var(--surface-soft)", borderBottom: "1px solid var(--ink-100)", fontWeight: 700, color: "var(--brand)" }}>
            {u.name}
          </div>
          <ol style={{ display: "flex", flexDirection: "column", gap: 6, padding: 10, margin: 0, listStyle: "none" }}>
            {u.lessons.map((l, li) => {
              const num = units.slice(0, ui).reduce((s, x) => s + x.lessons.length, 0) + li + 1;
              return (
                <li key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 13 }}>
                  <span style={{ width: 20, flexShrink: 0, fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textAlign: "center" }}>{num}</span>
                  <span style={{ flex: 1, minWidth: 150, color: "var(--text-body)" }}>{l.description}</span>
                  {l.skill && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--brand-700, var(--brand))", background: "var(--surface-soft)", borderRadius: 999, padding: "2px 8px" }}>{skillLabel(l.skill)}</span>
                  )}
                  {l.level && <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-muted)", minWidth: 28, textAlign: "center" }}>{l.level}</span>}
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </div>
  );
}
