// Minimal forward-only migration runner.
//
// Applies every *.sql file in supabase/migrations (lexical order) that hasn't
// been applied yet, each inside its own transaction, and records it in
// public.schema_migrations. Re-running is safe (already-applied files skip).
//
//   npm run db:migrate
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { makeClient } from "./db.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "supabase", "migrations");

const client = makeClient();

async function main() {
  await client.connect();

  await client.query(`
    create table if not exists public.schema_migrations (
      version    text primary key,
      applied_at timestamptz not null default now()
    );
  `);

  const { rows } = await client.query("select version from public.schema_migrations");
  const applied = new Set(rows.map((r) => r.version));

  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let n = 0;
  for (const file of files) {
    const version = file.replace(/\.sql$/, "");
    if (applied.has(version)) {
      console.log("skip  ", version);
      continue;
    }
    const sql = readFileSync(join(dir, file), "utf8");
    console.log("apply ", version);
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into public.schema_migrations(version) values ($1)", [version]);
      await client.query("commit");
      n++;
    } catch (e) {
      await client.query("rollback");
      console.error("FAILED ", version, "\n", e.message);
      await client.end();
      process.exit(1);
    }
  }

  console.log(`done — applied ${n} new migration(s).`);
  await client.end();
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
