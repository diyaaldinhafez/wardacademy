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

  // Tag objectives with a skill (5 petals = 5 skills) where missing.
  const skillMap = [
    ["past simple", "writing"],
    ["daily routines", "speaking"],
    ["opinion", "speaking"],
    ["main idea", "reading"],
    ["read", "reading"],
    ["write", "writing"],
    ["listen", "listening"],
    ["speak", "speaking"],
    ["vocab", "vocabulary"],
  ];
  const { rows: untagged } = await pg.query("select id, description from public.objectives where tenant_id=$1 and skill is null", [tenantId]);
  for (const o of untagged) {
    const hit = skillMap.find(([k]) => new RegExp(k, "i").test(o.description));
    await pg.query("update public.objectives set skill=$1::public.skill where id=$2", [hit ? hit[1] : "vocabulary", o.id]);
  }

  // A guardian + a learner (their child), so the learner practice view has an
  // account to sign in as. Guardian-anchored with consent granted.
  const GUARDIAN_EMAIL = process.env.SEED_GUARDIAN_EMAIL ?? "parent@ward.local";
  const GUARDIAN_PASSWORD = process.env.SEED_GUARDIAN_PASSWORD ?? "WardParent!2026";
  const LEARNER_EMAIL = process.env.SEED_LEARNER_EMAIL ?? "student@ward.local";
  const LEARNER_PASSWORD = process.env.SEED_LEARNER_PASSWORD ?? "WardStudent!2026";
  const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@ward.local";
  const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "WardAdmin!2026";

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
  const adminUser = await findOrCreate(ADMIN_EMAIL, ADMIN_PASSWORD);

  const upsertProfile = `insert into public.profiles(id, tenant_id, full_name, roles, is_minor, login_email)
       values ($1, $2, $3, $4::public.user_role[], $5, $6)
     on conflict (id) do update
       set tenant_id = excluded.tenant_id, roles = excluded.roles,
           full_name = excluded.full_name, is_minor = excluded.is_minor,
           login_email = excluded.login_email`;
  await pg.query(upsertProfile, [guardian.id, tenantId, "Parent (dev)", "{guardian}", false, GUARDIAN_EMAIL]);
  await pg.query(upsertProfile, [learner.id, tenantId, "Yousef (dev)", "{learner}", true, LEARNER_EMAIL]);
  await pg.query(upsertProfile, [adminUser.id, tenantId, "Operations (dev)", "{admin}", false, ADMIN_EMAIL]);
  await pg.query(
    `insert into public.guardianships(tenant_id, guardian_id, learner_id, relationship, consent_granted, consent_at)
       values ($1, $2, $3, 'parent', true, now())
     on conflict (guardian_id, learner_id) do nothing`,
    [tenantId, guardian.id, learner.id],
  );

  // ---- Demo content so the three accounts feel alive (each piece added once) ----
  const objs = (await pg.query("select id, description from public.objectives where tenant_id=$1 order by created_at", [tenantId])).rows;
  const routines = objs.find((o) => /routine/i.test(o.description)) ?? objs[1] ?? objs[0];
  const itemRows = (await pg.query("select id, format, status from public.items where tenant_id=$1 order by created_at", [tenantId])).rows;
  const approvedItems = itemRows.filter((i) => i.status === "approved");
  const cnt = async (tbl) => (await pg.query(`select count(*)::int n from public.${tbl} where tenant_id=$1`, [tenantId])).rows[0].n;

  // a draft for the teacher's "Drafts to review"
  if (!itemRows.some((i) => i.status === "draft") && routines) {
    const did = (
      await pg.query(
        `insert into public.items(tenant_id,objective_id,format,difficulty,prompt,content,origin,status,created_by)
           values ($1,$2,'multiple_choice','easy',$3,$4::jsonb,'ai','draft',$5) returning id`,
        [tenantId, routines.id, "Choose the correct question about a daily routine.", JSON.stringify({ options: ["What time you wake up?", "What time do you wake up?", "What time does you wake up?", "What time waking up?"] }), user.id],
      )
    ).rows[0].id;
    await pg.query("insert into public.item_keys(item_id,tenant_id,answer,explanation) values ($1,$2,$3::jsonb,$4)", [did, tenantId, JSON.stringify("What time do you wake up?"), "Present simple questions use 'do' + base verb."]);
    console.log("seeded: 1 draft item to review");
  }

  // assign the approved items to the learner
  if ((await cnt("assignments")) === 0 && approvedItems.length) {
    for (const it of approvedItems) {
      await pg.query("insert into public.assignments(tenant_id,item_id,learner_id,assigned_by) values ($1,$2,$3,$4) on conflict do nothing", [tenantId, it.id, learner.id, user.id]);
    }
    console.log("seeded: assigned", approvedItems.length, "items to the learner");
  }

  // a couple of graded submissions -> progress
  if ((await cnt("submissions")) === 0) {
    const gradable = approvedItems.filter((i) => ["multiple_choice", "true_false", "fill_blank"].includes(i.format));
    if (gradable[0]) await pg.query("insert into public.submissions(item_id,learner_id,response,is_correct,graded,graded_at) values ($1,$2,$3::jsonb,true,true,now())", [gradable[0].id, learner.id, JSON.stringify({ answer: "(demo)" })]);
    if (gradable[1]) await pg.query("insert into public.submissions(item_id,learner_id,response,is_correct,graded,graded_at) values ($1,$2,$3::jsonb,false,true,now())", [gradable[1].id, learner.id, JSON.stringify({ answer: "(demo)" })]);
    console.log("seeded: graded submissions -> progress");
  }

  // a past session (with approved report) + an upcoming one
  if ((await cnt("sessions")) === 0) {
    const past = new Date(Date.now() - 2 * 24 * 3600 * 1000); past.setUTCHours(15, 0, 0, 0);
    const future = new Date(Date.now() + 3 * 24 * 3600 * 1000); future.setUTCHours(16, 0, 0, 0);
    const sPast = (await pg.query("insert into public.sessions(tenant_id,instructor_id,learner_id,scheduled_at,duration_minutes,status) values ($1,$2,$3,$4,30,'completed') returning id", [tenantId, user.id, learner.id, past.toISOString()])).rows[0].id;
    await pg.query("insert into public.sessions(tenant_id,instructor_id,learner_id,scheduled_at,duration_minutes,status) values ($1,$2,$3,$4,30,'scheduled')", [tenantId, user.id, learner.id, future.toISOString()]);
    await pg.query(
      "insert into public.session_reports(session_id,tenant_id,learner_id,summary,strengths,improve,status,approved_at) values ($1,$2,$3,$4,$5,$6,'approved',now())",
      [sPast, tenantId, learner.id, "Yousef worked hard on the past simple tense and is making steady progress.", "Strong grasp of irregular verbs like 'went' and 'ate'.", "Practise forming present-simple questions at home."],
    );
    console.log("seeded: 2 sessions + approved report");
  }

  // a completed placement result
  if ((await cnt("placement_tests")) === 0) {
    await pg.query("insert into public.placement_tests(tenant_id,learner_id,status,suggested_level,completed_at) values ($1,$2,'completed','A2',now())", [tenantId, learner.id]);
    console.log("seeded: placement (A2)");
  }

  // an approved study plan
  if ((await cnt("study_plans")) === 0) {
    const planItems = [
      { description: "Use the past simple to talk about yesterday's activities", level: "A2" },
      { description: "Ask and answer questions about daily routines", level: "A2" },
      { description: "Read a short paragraph and find the main idea", level: "A2" },
      { description: "Give an opinion with a reason using 'because'", level: "B1" },
    ];
    await pg.query("insert into public.study_plans(tenant_id,learner_id,title,level,items,status,created_by,approved_at) values ($1,$2,$3,'A2',$4::jsonb,'approved',$5,now())", [tenantId, learner.id, "English Plan for Yousef — A2", JSON.stringify(planItems), user.id]);
    console.log("seeded: approved study plan");
  }

  // open intro slots so the public booking calendar has options
  if ((await cnt("availability_slots")) === 0) {
    const slotTimes = [];
    for (let d = 1; d <= 5; d++) {
      for (const h of [16, 18]) {
        const dt = new Date(Date.now() + d * 24 * 3600 * 1000);
        dt.setUTCHours(h, 0, 0, 0);
        slotTimes.push(dt.toISOString());
      }
    }
    for (const at of slotTimes) {
      await pg.query(
        "insert into public.availability_slots(tenant_id,instructor_id,starts_at,duration_minutes,status) values ($1,$2,$3,30,'open') on conflict (instructor_id, starts_at) do nothing",
        [tenantId, user.id, at],
      );
    }
    console.log("seeded:", slotTimes.length, "open intro slots");
  }

  console.log("\n=== Logins (http://localhost:3000/studio/login) ===");
  console.log("teacher :", EMAIL, "/", PASSWORD, "-> /studio");
  console.log("admin   :", ADMIN_EMAIL, "/", ADMIN_PASSWORD, "-> /admin");
  console.log("student :", LEARNER_EMAIL, "/", LEARNER_PASSWORD, "-> /learn");
  console.log("parent  :", GUARDIAN_EMAIL, "/", GUARDIAN_PASSWORD, "-> /guardian (next)");
} catch (e) {
  console.error("SEED ERROR:", e.message);
  process.exitCode = 1;
} finally {
  await pg.end();
}
