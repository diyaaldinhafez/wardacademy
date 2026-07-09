// RLS proof for the teacher-lifecycle coherence redesign (migration 0073) — G1–G8.
// Proves the teacher self-edit is owner-scoped + bio-ONLY: a teacher can read only her own
// teacher_profiles row and change ONLY her bio (via set_my_teacher_bio); she cannot write
// phone/status/notes/start_date, cannot touch another teacher's row, and cannot bypass the RPC
// to write bio directly. Admin retains full read/write. Runs with REAL user JWTs (not service
// role) so RLS is actually exercised — the access-token hook (0003) injects roles+tenant_id.
//
// Self-contained + idempotent; cleans up. REQUIRES migration 0073 applied.
// Run: nvm use 20 && node --env-file=.env.local scripts/teacher-profile-rls-proof.mjs
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!URL_ || !SVC || !ANON) { console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY (run with --env-file=.env.local)"); process.exit(1); }

const PW = "Proof-Pass-123!x";
const A_EMAIL = "teacher-rls-a@ward.test";
const B_EMAIL = "teacher-rls-b@ward.test";
const C_EMAIL = "admin-rls-c@ward.test";
let pass = 0, fail = 0;
const check = (name, ok, extra = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  ·  " + extra : ""}`); ok ? pass++ : fail++; };

const H_SVC = { apikey: SVC, Authorization: `Bearer ${SVC}`, "Content-Type": "application/json" };
async function j(r) { const t = await r.text(); try { return t ? JSON.parse(t) : null; } catch { return t; } }

// service-role REST (bypasses RLS — for setup/verification only)
async function rest(method, table, { query = "", body, prefer } = {}) {
  const headers = { ...H_SVC }; if (prefer) headers.Prefer = prefer;
  const r = await fetch(`${URL_}/rest/v1/${table}${query}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, data: await j(r) };
}
// user-scoped REST (RLS applies — apikey=anon, Bearer=user JWT)
async function restAs(token, method, table, { query = "", body, prefer } = {}) {
  const headers = { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json" }; if (prefer) headers.Prefer = prefer;
  const r = await fetch(`${URL_}/rest/v1/${table}${query}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, data: await j(r) };
}
async function rpcAs(token, fn, body) {
  const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { status: r.status, data: await j(r) };
}
async function auth(method, path, body) {
  const r = await fetch(`${URL_}/auth/v1/${path}`, { method, headers: H_SVC, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, data: await j(r) };
}
async function findUser(email) { const { data } = await auth("GET", "admin/users?per_page=200"); return (data?.users ?? []).find((u) => u.email === email) ?? null; }
async function signIn(email) {
  const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email, password: PW }) });
  const d = await j(r); return d?.access_token ?? null;
}
const claims = (jwt) => { try { return JSON.parse(Buffer.from(jwt.split(".")[1], "base64").toString()); } catch { return {}; } }
const bioOf = async (uid) => (await rest("GET", "teacher_profiles", { query: `?select=bio&instructor_id=eq.${uid}` })).data[0]?.bio;
const rowOf = async (uid) => (await rest("GET", "teacher_profiles", { query: `?select=phone,notes,start_date,status,bio&instructor_id=eq.${uid}` })).data[0];

async function purge(email) {
  const u = await findUser(email);
  if (u) { await rest("DELETE", "teacher_profiles", { query: `?instructor_id=eq.${u.id}` }); await rest("DELETE", "profiles", { query: `?id=eq.${u.id}` }); await auth("DELETE", `admin/users/${u.id}`); }
}
async function mkUser(email, roles, withProfile) {
  const created = (await auth("POST", "admin/users", { email, password: PW, email_confirm: true })).data;
  const uid = created.id;
  await rest("POST", "profiles", { body: { id: uid, tenant_id: ids.T, full_name: email, roles, login_email: email }, prefer: "return=minimal" });
  if (withProfile) await rest("POST", "teacher_profiles", { body: { tenant_id: ids.T, instructor_id: uid, bio: `${email}-original`, phone: `${email}-phone`, notes: `${email}-notes`, start_date: "2026-01-01", status: "active" }, prefer: "return=minimal" });
  return uid;
}

const ids = {};
async function run() {
  ids.T = (await rest("GET", "tenants", { query: "?select=id&is_default=eq.true&limit=1" })).data[0].id;
  for (const e of [A_EMAIL, B_EMAIL, C_EMAIL]) await purge(e);

  ids.A = await mkUser(A_EMAIL, ["instructor"], true);
  ids.B = await mkUser(B_EMAIL, ["instructor"], true);
  ids.C = await mkUser(C_EMAIL, ["admin"], false);

  const tokA = await signIn(A_EMAIL), tokB = await signIn(B_EMAIL), tokC = await signIn(C_EMAIL);
  if (!tokA || !tokB || !tokC) { check("SETUP: signed in A/B/C", false, "missing token — check auth"); return; }
  const cA = claims(tokA);
  check("SETUP: A's JWT carries roles+tenant (access-token hook active)", (cA.roles ?? []).includes("instructor") && !!cA.tenant_id, `roles=${JSON.stringify(cA.roles)} tenant=${cA.tenant_id ? "set" : "MISSING"}`);

  // ── G1: A can SELECT her OWN row ──────────────────────────────────────────────
  const g1 = await restAs(tokA, "GET", "teacher_profiles", { query: `?select=instructor_id,bio&instructor_id=eq.${ids.A}` });
  check("G1: teacher A can SELECT her own teacher_profiles row", Array.isArray(g1.data) && g1.data.length === 1 && g1.data[0].instructor_id === ids.A);

  // ── G2: A canNOT SELECT B's row (and sees ONLY her own across the table) ───────
  const g2 = await restAs(tokA, "GET", "teacher_profiles", { query: `?select=instructor_id&instructor_id=eq.${ids.B}` });
  const g2all = await restAs(tokA, "GET", "teacher_profiles", { query: `?select=instructor_id` });
  const onlyOwn = Array.isArray(g2all.data) && g2all.data.every((r) => r.instructor_id === ids.A);
  check("G2: teacher A canNOT SELECT teacher B's row (0 rows) + sees only her own", Array.isArray(g2.data) && g2.data.length === 0 && onlyOwn);

  // ── G3: A can set her OWN bio via the RPC ─────────────────────────────────────
  await rpcAs(tokA, "set_my_teacher_bio", { p_bio: "A-NEW-BIO" });
  check("G3: teacher A set_my_teacher_bio → her bio updated", (await bioOf(ids.A)) === "A-NEW-BIO");

  // ── G4: A's RPC did NOT touch B's bio ─────────────────────────────────────────
  check("G4: teacher A's RPC did NOT change teacher B's bio", (await bioOf(ids.B)) === `${B_EMAIL}-original`);

  // ── G5: A canNOT direct-UPDATE her own admin-owned fields ─────────────────────
  const g5 = await restAs(tokA, "PATCH", "teacher_profiles", { query: `?instructor_id=eq.${ids.A}`, body: { phone: "HACK", notes: "HACK", start_date: "2030-01-01", status: "inactive" }, prefer: "return=representation" });
  const aRow = await rowOf(ids.A);
  const g5unchanged = aRow.phone === `${A_EMAIL}-phone` && aRow.notes === `${A_EMAIL}-notes` && aRow.start_date === "2026-01-01" && aRow.status === "active";
  check("G5: teacher A direct-UPDATE of phone/status/notes/start_date is DENIED (0 rows, unchanged)", Array.isArray(g5.data) && g5.data.length === 0 && g5unchanged);

  // ── G6: A canNOT direct-UPDATE B's row ────────────────────────────────────────
  const g6 = await restAs(tokA, "PATCH", "teacher_profiles", { query: `?instructor_id=eq.${ids.B}`, body: { phone: "HACK-B", bio: "HACK-B" }, prefer: "return=representation" });
  const bRow = await rowOf(ids.B);
  check("G6: teacher A direct-UPDATE of teacher B's row is DENIED (0 rows, unchanged)", Array.isArray(g6.data) && g6.data.length === 0 && bRow.phone === `${B_EMAIL}-phone` && bRow.bio === `${B_EMAIL}-original`);

  // ── G7: A canNOT bypass the RPC to write bio directly ─────────────────────────
  const g7 = await restAs(tokA, "PATCH", "teacher_profiles", { query: `?instructor_id=eq.${ids.A}`, body: { bio: "DIRECT-HACK" }, prefer: "return=representation" });
  check("G7: teacher A direct-UPDATE of her OWN bio (bypassing RPC) is DENIED — RPC is sole write path", Array.isArray(g7.data) && g7.data.length === 0 && (await bioOf(ids.A)) === "A-NEW-BIO");

  // ── G8: admin retains full read + write (0037 policy intact) ──────────────────
  const g8read = await restAs(tokC, "GET", "teacher_profiles", { query: `?select=instructor_id&instructor_id=eq.${ids.A}` });
  const g8write = await restAs(tokC, "PATCH", "teacher_profiles", { query: `?instructor_id=eq.${ids.A}`, body: { notes: "admin-set" }, prefer: "return=representation" });
  check("G8: admin can read AND write any teacher_profiles row", Array.isArray(g8read.data) && g8read.data.length === 1 && Array.isArray(g8write.data) && g8write.data.length === 1 && (await rowOf(ids.A)).notes === "admin-set");
}

async function cleanup() { for (const e of [A_EMAIL, B_EMAIL, C_EMAIL]) await purge(e); }
try { await run(); } catch (e) { console.error("ERROR:", e.message); fail++; }
finally { await cleanup(); console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0); }
