// Drift guard: the .mjs seed mirror (aggregatePlanMirror) must stay byte-for-byte
// identical to the REAL production aggregatePlanItems. Run via tsx (dev-only, never
// in the build): npx tsx --env-file=.env.local scripts/verify-aggregate-mirror.ts
// Imports the actual TS production function (not a copy), so this catches any future
// divergence — not a dead snapshot.
import { createClient } from "@supabase/supabase-js";
import { aggregatePlanItems } from "../lib/curriculum/aggregatePlan";
import { aggregatePlanMirror } from "./lib/aggregatePlanMirror.mjs";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  let ok = true;
  for (const level of ["A1", "A2", "B1"]) {
    const prod = await aggregatePlanItems(supabase as never, level);
    const mirror = await aggregatePlanMirror(supabase, level);
    const same = JSON.stringify(prod) === JSON.stringify(mirror);
    if (!same) ok = false;
    console.log(`level ${level}: production=${prod.length} mirror=${mirror.length} | byte-for-byte: ${same ? "✓ IDENTICAL" : "✗ DIVERGED"}`);
    if (!same) {
      for (let i = 0; i < Math.max(prod.length, mirror.length); i++) {
        if (JSON.stringify(prod[i]) !== JSON.stringify(mirror[i])) {
          console.log(`  first diff @${i}:\n    prod  : ${JSON.stringify(prod[i])}\n    mirror: ${JSON.stringify(mirror[i])}`);
          break;
        }
      }
    }
  }
  console.log(ok ? "\nMIRROR MATCH GREEN — mirror == production aggregatePlanItems" : "\nMIRROR DRIFT");
  process.exit(ok ? 0 : 1);
}
main().catch((e) => { console.error("ERR", e.message); process.exit(1); });
