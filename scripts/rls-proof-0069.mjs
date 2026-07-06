// RLS proof for migration 0069 (teacher owner-scoping) — PURE REST, no @supabase/supabase-js
// (avoids realtime/WebSocket; runs under Node 20 with built-in fetch). Self-contained +
// idempotent: creates 2 ephemeral instructors (A,B) + a learner each in the DEFAULT tenant,
// seeds A-owned rows in all 5 tables (+ approved & draft item) via the service role, signs in
// as each via GoTrue (real JWTs carrying the access-token-hook claims), asserts cross-teacher
// denial (B-G1) and the items shared/draft split (B-G2) through PostgREST (RLS enforced), plus
// a positive control, then deletes all test data.
// Run: nvm use 20 && node --env-file=.env.local scripts/rls-proof-0069.mjs
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !ANON || !SVC) { console.error("Missing env (NEXT_PUBLIC_SUPABASE_URL/ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)"); process.exit(1); }

const PW = "RlsProof!2026";
const A_EMAIL = "rls-proof-a@ward.test", B_EMAIL = "rls-proof-b@ward.test";
const LA_EMAIL = "rls-proof-la@ward.test", LB_EMAIL = "rls-proof-lb@ward.test";
let pass = 0, fail = 0;
const check = (name, ok) => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}`); ok ? pass++ : fail++; };

const svcHeaders = { apikey: SVC, Authorization: `Bearer ${SVC}`, "Content-Type": "application/json" };

async function j(res) { const t = await res.text(); try { return t ? JSON.parse(t) : null; } catch { return t; } }

// PostgREST. jwt omitted → service role (bypasses RLS). jwt set → RLS enforced as that user.
async function rest(method, table, { query = "", body, jwt, prefer } = {}) {
  const headers = jwt ? { apikey: ANON, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" } : { ...svcHeaders };
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(`${URL}/rest/v1/${table}${query}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, data: await j(res) };
}
// GoTrue admin (service role)
async function auth(method, path, body) {
  const res = await fetch(`${URL}/auth/v1/${path}`, { method, headers: svcHeaders, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, data: await j(res) };
}
async function mkUser(email) {
  const { data } = await auth("GET", "admin/users?per_page=200");
  const users = data?.users ?? (Array.isArray(data) ? data : []);
  let u = users.find((x) => x.email === email);
  if (!u) u = (await auth("POST", "admin/users", { email, password: PW, email_confirm: true })).data;
  else await auth("PUT", `admin/users/${u.id}`, { password: PW });
  if (!u?.id) throw new Error(`mkUser ${email}: ${JSON.stringify(u)}`);
  return u.id;
}
async function signIn(email) {
  const res = await fetch(`${URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email, password: PW }) });
  const d = await j(res);
  if (!d?.access_token) throw new Error(`signIn ${email}: ${JSON.stringify(d)}`);
  return d.access_token;
}
async function insert(table, obj) {
  const { status, data } = await rest("POST", table, { body: obj, prefer: "return=representation" });
  if (!Array.isArray(data) || !data[0]) throw new Error(`insert ${table} failed (${status}): ${JSON.stringify(data)}`);
  return data[0].id;
}
async function upsertProfile(obj) {
  const { status, data } = await rest("POST", "profiles", { body: obj, query: "?on_conflict=id", prefer: "resolution=merge-duplicates,return=minimal" });
  if (status >= 300) throw new Error(`upsert profile failed (${status}): ${JSON.stringify(data)}`);
}
const uget = async (jwt, table, id) => { const { data } = await rest("GET", table, { jwt, query: `?select=id&id=eq.${id}` }); return Array.isArray(data) ? data : []; };
const uupdate = async (jwt, table, id, patch) => { const { data } = await rest("PATCH", table, { jwt, query: `?id=eq.${id}`, body: patch, prefer: "return=representation" }); return Array.isArray(data) ? data : []; };

const ids = {};
async function setup() {
  const { data: ts } = await rest("GET", "tenants", { query: "?select=id&is_default=eq.true&limit=1" });
  ids.T = ts[0].id;
  ids.A = await mkUser(A_EMAIL); ids.B = await mkUser(B_EMAIL);
  ids.lA = await mkUser(LA_EMAIL); ids.lB = await mkUser(LB_EMAIL);
  await upsertProfile({ id: ids.A, tenant_id: ids.T, full_name: "RLS Teacher A", roles: ["instructor"], is_minor: false, login_email: A_EMAIL });
  await upsertProfile({ id: ids.B, tenant_id: ids.T, full_name: "RLS Teacher B", roles: ["instructor"], is_minor: false, login_email: B_EMAIL });
  await upsertProfile({ id: ids.lA, tenant_id: ids.T, full_name: "RLS Learner A", roles: ["learner"], is_minor: true, login_email: LA_EMAIL, assigned_instructor_id: ids.A });
  await upsertProfile({ id: ids.lB, tenant_id: ids.T, full_name: "RLS Learner B", roles: ["learner"], is_minor: true, login_email: LB_EMAIL, assigned_instructor_id: ids.B });

  const past = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  ids.sessionA = await insert("sessions", { tenant_id: ids.T, instructor_id: ids.A, learner_id: ids.lA, scheduled_at: past, duration_minutes: 30, status: "completed" });
  ids.reportA = await insert("session_reports", { session_id: ids.sessionA, tenant_id: ids.T, learner_id: ids.lA, summary: "proof", status: "draft" });
  ids.hwA = await insert("manual_homework", { tenant_id: ids.T, instructor_id: ids.A, learner_id: ids.lA, title: "proof hw", status: "submitted", submitted_at: past });
  ids.assessA = await insert("assessments", { tenant_id: ids.T, learner_id: ids.lA, title: "proof assess", scope: "unit", status: "draft", created_by: ids.A });
  const { data: objs } = await rest("GET", "curriculum_objectives", { query: "?select=objective_id&limit=1" });
  const oid = objs[0].objective_id;
  const mkItem = (status) => insert("items", { tenant_id: ids.T, objective_id: oid, format: "multiple_choice", difficulty: "medium", prompt: `proof ${status}`, content: {}, origin: "ai", status, created_by: ids.A });
  ids.itemDraftA = await mkItem("draft");
  ids.itemApprovedA = await mkItem("approved");
}

async function run() {
  await setup();
  const jB = await signIn(B_EMAIL);
  check("B-G1 sessions: B cannot read A's session", (await uget(jB, "sessions", ids.sessionA)).length === 0);
  check("B-G1 session_reports: B cannot read A's report", (await uget(jB, "session_reports", ids.reportA)).length === 0);
  check("B-G1 manual_homework: B cannot read A's homework", (await uget(jB, "manual_homework", ids.hwA)).length === 0);
  check("B-G1 assessments: B cannot read A's assessment", (await uget(jB, "assessments", ids.assessA)).length === 0);
  check("B-G1 sessions: B cannot UPDATE A's session", (await uupdate(jB, "sessions", ids.sessionA, { lesson_title: "hacked" })).length === 0);
  check("B-G2 items: B CAN read A's APPROVED item (shared bank)", (await uget(jB, "items", ids.itemApprovedA)).length === 1);
  check("B-G2 items: B CANNOT read A's DRAFT item", (await uget(jB, "items", ids.itemDraftA)).length === 0);
  check("B-G2 items: B CANNOT approve A's DRAFT item", (await uupdate(jB, "items", ids.itemDraftA, { status: "approved" })).length === 0);
  const jA = await signIn(A_EMAIL);
  check("CTRL A CAN read own session", (await uget(jA, "sessions", ids.sessionA)).length === 1);
  check("CTRL A CAN read own report", (await uget(jA, "session_reports", ids.reportA)).length === 1);
  check("CTRL A CAN read own homework", (await uget(jA, "manual_homework", ids.hwA)).length === 1);
  check("CTRL A CAN read own assessment", (await uget(jA, "assessments", ids.assessA)).length === 1);
  check("CTRL A CAN read own DRAFT item", (await uget(jA, "items", ids.itemDraftA)).length === 1);
}

async function cleanup() {
  for (const [t, id] of [["session_reports", ids.reportA], ["manual_homework", ids.hwA], ["assessments", ids.assessA], ["items", ids.itemDraftA], ["items", ids.itemApprovedA], ["sessions", ids.sessionA]])
    if (id) await rest("DELETE", t, { query: `?id=eq.${id}` });
  for (const id of [ids.A, ids.B, ids.lA, ids.lB]) if (id) { await rest("DELETE", "profiles", { query: `?id=eq.${id}` }); await auth("DELETE", `admin/users/${id}`); }
}

try { await run(); } catch (e) { console.error("ERROR:", e.message); fail++; }
finally { await cleanup(); console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0); }
