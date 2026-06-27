// Loads the audited English renderings (content/descriptor_en/descriptor_en.json)
// into curriculum_objectives.descriptor_en (by objective_id) and
// curriculum_units.title_en (by unit_id). Idempotent: UPDATE by key, no inserts,
// re-runnable. Arabic source columns are never touched. Run:
//   node --env-file=.env.local scripts/load-descriptor-en.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { objectives, titles } = JSON.parse(
  readFileSync(join(root, "content/descriptor_en/descriptor_en.json"), "utf8"),
);

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

let okObj = 0;
for (const { objective_id, descriptor_en } of objectives) {
  const { data, error } = await sb
    .from("curriculum_objectives")
    .update({ descriptor_en })
    .eq("objective_id", objective_id)
    .select("objective_id");
  if (error) { console.error("objective", objective_id, "→", error.message); process.exit(1); }
  if (!data?.length) { console.error("objective", objective_id, "→ matched 0 rows"); process.exit(1); }
  okObj++;
}

let okTitle = 0;
for (const [unit_id, title_en] of Object.entries(titles)) {
  const { data, error } = await sb
    .from("curriculum_units")
    .update({ title_en })
    .eq("unit_id", unit_id)
    .select("unit_id");
  if (error) { console.error("unit", unit_id, "→", error.message); process.exit(1); }
  if (!data?.length) { console.error("unit", unit_id, "→ matched 0 rows"); process.exit(1); }
  okTitle++;
}

console.log(`✅ updated descriptor_en on ${okObj} objectives · title_en on ${okTitle} units`);
