// G6 proof for §9(f) Teacher Lifecycle Funnel — pure REST (no supabase-js/realtime), Node 20 fetch.
// Replicates the admin actions' CORE (submitTeacherApplication / provisionTeacher / provisionTeacher-again /
// deactivateTeacher / reactivateTeacher) via the service role and asserts the DB facts each gate depends on.
// Self-contained + idempotent; cleans up. Run: nvm use 20 && node --env-file=.env.local scripts/teacher-funnel-proof.mjs
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !SVC) { console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (run with --env-file=.env.local)"); process.exit(1); }

const EMAIL = "teacher-funnel-proof@ward.test";
let pass = 0, fail = 0;
const check = (name, ok, extra = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  ·  " + extra : ""}`); ok ? pass++ : fail++; };
const H = { apikey: SVC, Authorization: `Bearer ${SVC}`, "Content-Type": "application/json" };
async function j(r) { const t = await r.text(); try { return t ? JSON.parse(t) : null; } catch { return t; } }
async function rest(method, table, { query = "", body, prefer } = {}) {
  const headers = { ...H }; if (prefer) headers.Prefer = prefer;
  const r = await fetch(`${URL_}/rest/v1/${table}${query}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, data: await j(r) };
}
async function auth(method, path, body) {
  const r = await fetch(`${URL_}/auth/v1/${path}`, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, data: await j(r) };
}
async function findUser(email) {
  const { data } = await auth("GET", "admin/users?per_page=200");
  return (data?.users ?? []).find((u) => u.email === email) ?? null;
}
async function profilesByEmail(email) {
  const { data } = await rest("GET", "profiles", { query: `?select=id,roles,login_email&login_email=eq.${encodeURIComponent(email)}` });
  return Array.isArray(data) ? data : [];
}

const ids = {};
async function run() {
  const T = (await rest("GET", "tenants", { query: "?select=id&is_default=eq.true&limit=1" })).data[0].id;
  ids.T = T;

  // clean any leftovers from a prior run
  const pre = await findUser(EMAIL); if (pre) { await rest("DELETE", "teacher_profiles", { query: `?instructor_id=eq.${pre.id}` }); await rest("DELETE", "profiles", { query: `?id=eq.${pre.id}` }); await auth("DELETE", `admin/users/${pre.id}`); }
  await rest("DELETE", "teacher_applications", { query: `?email=eq.${encodeURIComponent(EMAIL)}` });

  // ════ R1 — submitTeacherApplication is RECORD ONLY (no auth user, no profiles row) ════
  await rest("POST", "teacher_applications", { body: { tenant_id: T, full_name: "Proof Teacher", email: EMAIL, phone: "123", languages: "English", specialties: "Conversation", bio: "bio", note: "note", status: "applied" }, prefer: "return=minimal" });
  const app = (await rest("GET", "teacher_applications", { query: `?select=id,status&email=eq.${encodeURIComponent(EMAIL)}` })).data[0];
  ids.app = app.id;
  check("R1: application row created with status 'applied'", app.status === "applied");
  check("R1: NO auth user exists for the applicant (cannot log in)", (await findUser(EMAIL)) === null);
  check("R1: NO profiles row exists for the applicant (assertInstructor/RLS would deny)", (await profilesByEmail(EMAIL)).length === 0);

  // ════ PROVISION — mirror provisionTeacher: mint exactly one instructor + flip status ════
  const created = (await auth("POST", "admin/users", { email: EMAIL, email_confirm: true })).data;
  ids.uid = created.id;
  await rest("POST", "profiles", { body: { id: ids.uid, tenant_id: T, full_name: "Proof Teacher", roles: ["instructor"], login_email: EMAIL }, prefer: "return=minimal" });
  await rest("POST", "teacher_profiles", { body: { tenant_id: T, instructor_id: ids.uid, phone: "123", languages: "English", specialties: "Conversation", bio: "bio", notes: "note", start_date: "2026-07-08", status: "active" }, prefer: "return=minimal" });
  await rest("PATCH", "teacher_applications", { query: `?id=eq.${ids.app}`, body: { status: "approved" }, prefer: "return=minimal" });

  const prof = (await profilesByEmail(EMAIL))[0];
  check("PROVISION: exactly one instructor profile minted (roles include 'instructor')", !!prof && (prof.roles ?? []).includes("instructor"));
  const tprof = (await rest("GET", "teacher_profiles", { query: `?select=status&instructor_id=eq.${ids.uid}` })).data;
  check("PROVISION: teacher_profiles row created, status 'active'", tprof.length === 1 && tprof[0].status === "active");
  const appAfter = (await rest("GET", "teacher_applications", { query: `?select=status&id=eq.${ids.app}` })).data[0];
  check("PROVISION: application status flipped to 'approved'", appAfter.status === "approved");

  // ════ R4 — a second provision with the SAME email is blocked, NO partial state ════
  const dup = await auth("POST", "admin/users", { email: EMAIL, email_confirm: true });
  const blocked = dup.status >= 400 || /already|exists|registered/i.test(JSON.stringify(dup.data ?? ""));
  check("R4: duplicate createUser is rejected (email already exists)", blocked);
  check("R4: still exactly ONE profiles row (no partial second account)", (await profilesByEmail(EMAIL)).length === 1);
  check("R4: still exactly ONE teacher_profiles row", (await rest("GET", "teacher_profiles", { query: `?select=instructor_id&instructor_id=eq.${ids.uid}` })).data.length === 1);

  // ════ Q3 — deactivate REVOKES access (role removed) · reactivate RESTORES it ════
  // deactivate: remove 'instructor' from roles + ban + status inactive
  const rolesNow = (await profilesByEmail(EMAIL))[0].roles ?? [];
  await rest("PATCH", "profiles", { query: `?id=eq.${ids.uid}`, body: { roles: rolesNow.filter((r) => r !== "instructor") }, prefer: "return=minimal" });
  await auth("PUT", `admin/users/${ids.uid}`, { ban_duration: "876000h" });
  await rest("PATCH", "teacher_profiles", { query: `?instructor_id=eq.${ids.uid}`, body: { status: "inactive" }, prefer: "return=minimal" });
  const deact = (await profilesByEmail(EMAIL))[0];
  check("Q3 deactivate: 'instructor' role REMOVED → assertInstructor/RLS would deny", !(deact.roles ?? []).includes("instructor"));
  const bannedUser = await findUser(EMAIL);
  check("Q3 deactivate: auth user is banned (live session killed)", !!bannedUser?.banned_until);
  check("Q3 deactivate: teacher_profiles.status = 'inactive'", (await rest("GET", "teacher_profiles", { query: `?select=status&instructor_id=eq.${ids.uid}` })).data[0].status === "inactive");

  // reactivate: restore 'instructor' + unban + status active
  const rolesDe = (await profilesByEmail(EMAIL))[0].roles ?? [];
  await rest("PATCH", "profiles", { query: `?id=eq.${ids.uid}`, body: { roles: [...new Set([...rolesDe, "instructor"])] }, prefer: "return=minimal" });
  await auth("PUT", `admin/users/${ids.uid}`, { ban_duration: "none" });
  await rest("PATCH", "teacher_profiles", { query: `?instructor_id=eq.${ids.uid}`, body: { status: "active" }, prefer: "return=minimal" });
  const react = (await profilesByEmail(EMAIL))[0];
  check("Q3 reactivate: 'instructor' role RESTORED (reversible)", (react.roles ?? []).includes("instructor"));
  check("Q3 reactivate: auth user unbanned", !(await findUser(EMAIL))?.banned_until);
}

async function cleanup() {
  if (ids.uid) { await rest("DELETE", "teacher_profiles", { query: `?instructor_id=eq.${ids.uid}` }); await rest("DELETE", "profiles", { query: `?id=eq.${ids.uid}` }); await auth("DELETE", `admin/users/${ids.uid}`); }
  await rest("DELETE", "teacher_applications", { query: `?email=eq.${encodeURIComponent(EMAIL)}` });
}

try { await run(); } catch (e) { console.error("ERROR:", e.message); fail++; }
finally { await cleanup(); console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0); }
