// Prints every table in the public schema with its RLS state and policy count.
// Use to verify migrations.   npm run db:status
import { makeClient } from "./db.mjs";

const client = makeClient();

async function main() {
  await client.connect();
  const { rows } = await client.query(`
    select
      c.relname                                   as table_name,
      c.relrowsecurity                            as rls_enabled,
      c.relforcerowsecurity                       as rls_forced,
      (select count(*) from pg_policies p
         where p.schemaname = 'public' and p.tablename = c.relname) as policies
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
    order by c.relname;
  `);
  if (rows.length === 0) console.log("(no tables in public schema)");
  else console.table(rows);
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
