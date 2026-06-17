// Dev seed: a teacher account + tenant + sample objectives. Idempotent.
//   npm run db:seed
import { createClient } from "@supabase/supabase-js";
import { makeClient } from "./db.mjs";

const EMAIL = process.env.SEED_TEACHER_EMAIL ?? "teacher@ward.local";
const PASSWORD = process.env.SEED_TEACHER_PASSWORD ?? "WardTeacher!2026";
const TENANT_NAME = "Ward Academy (dev)";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const pg = makeClient();

async function findUserByEmail(email) {
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const u = data.users.find((x) => x.email === email);
    if (u) return u;
    if (data.users.length < 200) return null;
  }
}

try {
  await pg.connect();

  let user = await findUserByEmail(EMAIL);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    user = data.user;
    console.log("created teacher user:", EMAIL);
  } else {
    console.log("teacher user exists:", EMAIL);
  }

  let { rows } = await pg.query("select id from public.tenants where name=$1 limit 1", [TENANT_NAME]);
  let tenantId = rows[0]?.id;
  if (!tenantId) {
    tenantId = (await pg.query("insert into public.tenants(name) values ($1) returning id", [TENANT_NAME])).rows[0].id;
    console.log("created tenant:", TENANT_NAME);
  }
  // self-serve signups join the default tenant
  await pg.query("update public.tenants set is_default = true where id = $1", [tenantId]);

  await pg.query(
    `insert into public.profiles(id, tenant_id, full_name, roles, login_email)
       values ($1, $2, $3, array['instructor']::public.user_role[], $4)
     on conflict (id) do update
       set tenant_id = excluded.tenant_id, roles = excluded.roles,
           full_name = excluded.full_name, login_email = excluded.login_email`,
    [user.id, tenantId, "Teacher (dev)", EMAIL],
  );

  const { rows: c } = await pg.query("select count(*)::int n from public.objectives where tenant_id=$1", [tenantId]);
  if (c[0].n === 0) {
    const samples = [
      ["cefr", "A2", "Use the past simple tense to describe activities done yesterday"],
      ["cefr", "A2", "Ask and answer simple questions about daily routines"],
      ["cefr", "B1", "Express opinions and give reasons using because and so"],
      ["school", "Grade 6 - Unit 3", "Read a short paragraph and identify the main idea"],
    ];
    for (const [track, level, description] of samples) {
      await pg.query(
        "insert into public.objectives(tenant_id, track, level, description, created_by) values ($1,$2,$3,$4,$5)",
        [tenantId, track, level, description, user.id],
      );
    }
    console.log("seeded", samples.length, "objectives");
  } else {
    console.log("objectives already present:", c[0].n);
  }

  // A guardian + a learner (their child), so the learner practice view has an
  // account to sign in as. Guardian-anchored with consent granted.
  const GUARDIAN_EMAIL = process.env.SEED_GUARDIAN_EMAIL ?? "parent@ward.local";
  const GUARDIAN_PASSWORD = process.env.SEED_GUARDIAN_PASSWORD ?? "WardParent!2026";
  const LEARNER_EMAIL = process.env.SEED_LEARNER_EMAIL ?? "student@ward.local";
  const LEARNER_PASSWORD = process.env.SEED_LEARNER_PASSWORD ?? "WardStudent!2026";

  async function findOrCreate(email, password) {
    let u = await findUserByEmail(email);
    if (!u) {
      const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (error) throw error;
      u = data.user;
      console.log("created user:", email);
    } else {
      console.log("user exists:", email);
    }
    return u;
  }

  const guardian = await findOrCreate(GUARDIAN_EMAIL, GUARDIAN_PASSWORD);
  const learner = await findOrCreate(LEARNER_EMAIL, LEARNER_PASSWORD);

  const upsertProfile = `insert into public.profiles(id, tenant_id, full_name, roles, is_minor, login_email)
       values ($1, $2, $3, $4::public.user_role[], $5, $6)
     on conflict (id) do update
       set tenant_id = excluded.tenant_id, roles = excluded.roles,
           full_name = excluded.full_name, is_minor = excluded.is_minor,
           login_email = excluded.login_email`;
  await pg.query(upsertProfile, [guardian.id, tenantId, "Parent (dev)", "{guardian}", false, GUARDIAN_EMAIL]);
  await pg.query(upsertProfile, [learner.id, tenantId, "Yousef (dev)", "{learner}", true, LEARNER_EMAIL]);
  await pg.query(
    `insert into public.guardianships(tenant_id, guardian_id, learner_id, relationship, consent_granted, consent_at)
       values ($1, $2, $3, 'parent', true, now())
     on conflict (guardian_id, learner_id) do nothing`,
    [tenantId, guardian.id, learner.id],
  );

  console.log("\n=== Logins (http://localhost:3000/studio/login) ===");
  console.log("teacher :", EMAIL, "/", PASSWORD, "-> /studio");
  console.log("student :", LEARNER_EMAIL, "/", LEARNER_PASSWORD, "-> /learn");
  console.log("parent  :", GUARDIAN_EMAIL, "/", GUARDIAN_PASSWORD, "-> /guardian (next)");
} catch (e) {
  console.error("SEED ERROR:", e.message);
  process.exitCode = 1;
} finally {
  await pg.end();
}
