// Proof for the teacher/application ARCHIVE + application DELETE work (migration 0074).
// Pure REST (service role), mirrors teacher-funnel-proof.mjs: replicates each admin action's CORE
// and asserts the DB facts each gate depends on. Self-contained + idempotent; cleans up.
// REQUIRES migration 0074 applied. Run: nvm use 20 && node --env-file=.env.local scripts/teacher-archive-proof.mjs
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !SVC) { console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (run with --env-file=.env.local)"); process.exit(1); }

const A_EMAIL = "archive-app-a@ward.test";           // never-approved application (deletable)
const LINK_EMAIL = "archive-linked@ward.test";       // approved application linked to a live account (undeletable)
const T_EMAIL = "archive-teacher@ward.test";         // teacher for archive/restore
let pass = 0, fail = 0;
const check = (name, ok, extra = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  ·  " + extra : ""}`); ok ? pass++ : fail++; };
const H = { apikey: SVC, Authorization: `Bearer ${SVC}`, "Content-Type": "application/json" };
async function j(r) { const t = await r.text(); try { return t ? JSON.parse(t) : null; } catch { return t; } }
async function rest(method, table, { query = "", body, prefer } = {}) {
  const headers = { ...H }; if (prefer) headers.Prefer = prefer;
  const r = await fetch(`${URL_}/rest/v1/${table}${query}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, data: await j(r) };
}
async function authApi(method, path, body) {
  const r = await fetch(`${URL_}/auth/v1/${path}`, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, data: await j(r) };
}
async function findUser(email) { const { data } = await authApi("GET", "admin/users?per_page=200"); return (data?.users ?? []).find((u) => u.email === email) ?? null; }
const appById = async (id) => (await rest("GET", "teacher_applications", { query: `?select=id,status,instructor_id&id=eq.${id}` })).data;
const profRow = async (id) => (await rest("GET", "profiles", { query: `?select=id,roles&id=eq.${id}` })).data;
const tpRow = async (id) => (await rest("GET", "teacher_profiles", { query: `?select=instructor_id,status,archived_at&instructor_id=eq.${id}` })).data;

// ── replicate deleteApplication's SERVER GUARD exactly: refuse if linked to a LIVE account ──
async function deleteGuardAllows(appId) {
  const app = (await appById(appId))[0];
  if (!app) return { allow: false, reason: "not found" };
  if (app.instructor_id) {
    const acct = await profRow(app.instructor_id);
    if (acct.length) return { allow: false, reason: "linked to live account" };
  }
  return { allow: true };
}

const ids = {};
async function purgeUser(email) {
  const u = await findUser(email);
  if (u) { await rest("DELETE", "teacher_profiles", { query: `?instructor_id=eq.${u.id}` }); await rest("DELETE", "teacher_applications", { query: `?instructor_id=eq.${u.id}` }); await rest("DELETE", "profiles", { query: `?id=eq.${u.id}` }); await authApi("DELETE", `admin/users/${u.id}`); }
}
async function run() {
  ids.T = (await rest("GET", "tenants", { query: "?select=id&is_default=eq.true&limit=1" })).data[0].id;
  for (const e of [A_EMAIL, LINK_EMAIL, T_EMAIL]) { await rest("DELETE", "teacher_applications", { query: `?email=eq.${encodeURIComponent(e)}` }); await purgeUser(e); }

  // ════ APPLICATIONS ════
  // App A — 'applied', NO account link (deletable)
  await rest("POST", "teacher_applications", { body: { tenant_id: ids.T, full_name: "App A", email: A_EMAIL, status: "applied" }, prefer: "return=minimal" });
  ids.appA = (await rest("GET", "teacher_applications", { query: `?select=id&email=eq.${encodeURIComponent(A_EMAIL)}` })).data[0].id;

  // A1 archiveApplication: applied → archived (guard: from applied/rejected)
  await rest("PATCH", "teacher_applications", { query: `?id=eq.${ids.appA}&status=in.(applied,rejected)`, body: { status: "archived" }, prefer: "return=minimal" });
  const a1 = (await appById(ids.appA))[0];
  const pendingHasA = (await rest("GET", "teacher_applications", { query: `?select=id&status=eq.applied&id=eq.${ids.appA}` })).data.length;
  const archivedHasA = (await rest("GET", "teacher_applications", { query: `?select=id&status=in.(rejected,archived)&id=eq.${ids.appA}` })).data.length;
  check("A1: archiveApplication applied→archived (out of Pending, into Archived view)", a1.status === "archived" && pendingHasA === 0 && archivedHasA === 1);

  // A2 restoreApplication: archived → applied
  await rest("PATCH", "teacher_applications", { query: `?id=eq.${ids.appA}&status=in.(archived,rejected)`, body: { status: "applied", reviewed_by: null, reviewed_at: null }, prefer: "return=minimal" });
  check("A2: restoreApplication archived→applied (back in Pending)", (await appById(ids.appA))[0].status === "applied");

  // A3 deleteApplication HAPPY: never-approved (null link) → guard allows → delete → gone; no account ever
  const g3 = await deleteGuardAllows(ids.appA);
  if (g3.allow) await rest("DELETE", "teacher_applications", { query: `?id=eq.${ids.appA}` });
  check("A3: deleteApplication (unlinked) is ALLOWED, row deleted, no account ever existed",
    g3.allow === true && (await appById(ids.appA)).length === 0 && (await findUser(A_EMAIL)) === null);

  // App LINK — an APPROVED application linked to a LIVE account (must be undeletable)
  const linkedUser = (await authApi("POST", "admin/users", { email: LINK_EMAIL, email_confirm: true })).data;
  ids.linkUid = linkedUser.id;
  await rest("POST", "profiles", { body: { id: ids.linkUid, tenant_id: ids.T, full_name: "Linked Teacher", roles: ["instructor"], login_email: LINK_EMAIL }, prefer: "return=minimal" });
  await rest("POST", "teacher_applications", { body: { tenant_id: ids.T, full_name: "Linked", email: LINK_EMAIL, status: "approved", instructor_id: ids.linkUid }, prefer: "return=minimal" });
  ids.appLink = (await rest("GET", "teacher_applications", { query: `?select=id&email=eq.${encodeURIComponent(LINK_EMAIL)}` })).data[0].id;

  // A4 deleteApplication GUARD: approved + live link → REFUSED; row persists; account untouched
  const g4 = await deleteGuardAllows(ids.appLink);
  check("A4: deleteApplication (approved + live account) is REFUSED by the server guard", g4.allow === false && g4.reason === "linked to live account");
  check("A4: the refused application STILL EXISTS and its account is untouched", (await appById(ids.appLink)).length === 1 && (await profRow(ids.linkUid)).length === 1);

  // ════ TEACHERS ════
  const tUser = (await authApi("POST", "admin/users", { email: T_EMAIL, email_confirm: true })).data;
  ids.tUid = tUser.id;
  await rest("POST", "profiles", { body: { id: ids.tUid, tenant_id: ids.T, full_name: "Archive Teacher", roles: ["instructor"], login_email: T_EMAIL }, prefer: "return=minimal" });
  await rest("POST", "teacher_profiles", { body: { tenant_id: ids.T, instructor_id: ids.tUid, status: "active" }, prefer: "return=minimal" });

  // T1 archiveTeacher = revoke access (role removed + ban + status inactive) + archived_at set
  const rolesNow = (await profRow(ids.tUid))[0].roles ?? [];
  await rest("PATCH", "profiles", { query: `?id=eq.${ids.tUid}`, body: { roles: rolesNow.filter((r) => r !== "instructor") }, prefer: "return=minimal" });
  await authApi("PUT", `admin/users/${ids.tUid}`, { ban_duration: "876000h" });
  await rest("PATCH", "teacher_profiles", { query: `?instructor_id=eq.${ids.tUid}`, body: { status: "inactive", archived_at: new Date(0).toISOString() }, prefer: "return=minimal" });
  const t1p = (await profRow(ids.tUid))[0], t1tp = (await tpRow(ids.tUid))[0], t1u = await findUser(T_EMAIL);
  check("T1: archiveTeacher revokes access (role gone + banned + inactive) AND sets archived_at",
    !(t1p.roles ?? []).includes("instructor") && !!t1u?.banned_until && t1tp.status === "inactive" && !!t1tp.archived_at);

  // T2 roster (archived_at is null) excludes; archived (archived_at not null) includes
  const inRoster = (await rest("GET", "teacher_profiles", { query: `?select=instructor_id&instructor_id=eq.${ids.tUid}&archived_at=is.null` })).data.length;
  const inArchived = (await rest("GET", "teacher_profiles", { query: `?select=instructor_id&instructor_id=eq.${ids.tUid}&archived_at=not.is.null` })).data.length;
  check("T2: archived teacher is OUT of the roster query and IN the archived query", inRoster === 0 && inArchived === 1);

  // T3 restoreTeacher = archived_at null ONLY (role still absent, still banned → NO access)
  await rest("PATCH", "teacher_profiles", { query: `?instructor_id=eq.${ids.tUid}`, body: { archived_at: null }, prefer: "return=minimal" });
  const t3p = (await profRow(ids.tUid))[0], t3tp = (await tpRow(ids.tUid))[0], t3u = await findUser(T_EMAIL);
  check("T3: restoreTeacher returns to roster (archived_at null) but STILL deactivated (no role, still banned)",
    !t3tp.archived_at && !(t3p.roles ?? []).includes("instructor") && !!t3u?.banned_until);

  // T4 reactivateTeacher after restore: role restored + unbanned (normal access path still works)
  const rolesDe = (await profRow(ids.tUid))[0].roles ?? [];
  await rest("PATCH", "profiles", { query: `?id=eq.${ids.tUid}`, body: { roles: [...new Set([...rolesDe, "instructor"])] }, prefer: "return=minimal" });
  await authApi("PUT", `admin/users/${ids.tUid}`, { ban_duration: "none" });
  const t4p = (await profRow(ids.tUid))[0];
  check("T4: reactivateTeacher after restore re-grants access (role back + unbanned)", (t4p.roles ?? []).includes("instructor") && !(await findUser(T_EMAIL))?.banned_until);

  // T5 HARD-RULE: the account + profile survived the whole archive→restore→reactivate cycle
  check("T5: NO hard-delete — profiles + teacher_profiles + auth user all survive the cycle",
    (await profRow(ids.tUid)).length === 1 && (await tpRow(ids.tUid)).length === 1 && !!(await findUser(T_EMAIL)));
}

async function cleanup() {
  for (const e of [A_EMAIL, LINK_EMAIL, T_EMAIL]) { await rest("DELETE", "teacher_applications", { query: `?email=eq.${encodeURIComponent(e)}` }); await purgeUser(e); }
}
try { await run(); } catch (e) { console.error("ERROR:", e.message); fail++; }
finally { await cleanup(); console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0); }
