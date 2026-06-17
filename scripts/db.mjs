// Shared Postgres connection for migration / admin scripts.
//
// Parses SUPABASE_DB_URL *literally* (no percent-decoding) so a database
// password containing special characters works as typed. The URL must NOT
// contain an "@" inside the password (reset the password if it does).
//
// Run scripts with:  node --env-file=.env.local scripts/<name>.mjs
import pg from "pg";

export function dbConfig() {
  const s = (process.env.SUPABASE_DB_URL || "").trim();
  if (!s) throw new Error("Missing SUPABASE_DB_URL — add it to .env.local");

  const after = s.slice(s.indexOf("://") + 3);
  const at = after.lastIndexOf("@");
  const userinfo = after.slice(0, at);
  const hostpart = after.slice(at + 1);

  const ci = userinfo.indexOf(":");
  const user = userinfo.slice(0, ci);
  const password = userinfo.slice(ci + 1); // literal, undecoded

  const slash = hostpart.indexOf("/");
  const hostport = slash === -1 ? hostpart : hostpart.slice(0, slash);
  let database = slash === -1 ? "postgres" : hostpart.slice(slash + 1);
  database = database.split("?")[0] || "postgres";
  const [host, port] = hostport.split(":");

  return {
    host,
    port: Number(port) || 5432,
    user,
    password,
    database,
    ssl: { rejectUnauthorized: false },
  };
}

export function makeClient() {
  return new pg.Client(dbConfig());
}
