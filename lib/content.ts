/**
 * Ward Academy — landing page content.
 *
 * All user-facing copy lives here in one place so it stays easy to edit and is
 * ready for future localization (v1 is English / LTR only). Keep this file free
 * of markup; components decide how to render it.
 */

export const site = {
  name: "Ward Academy",
  tagline: "Confident English, teacher-led & AI-supported",
  primaryCta: "Book a free trial",
  secondaryCta: "See how it works",
};

/**
 * Landing page copy — rebuilt from the Ward Academy Design System landing kit.
 * Sections: nav · hero · how-it-works · trust (draft → approved) · five skills ·
 * final CTA · footer. Bilingual (Arabic lives in lib/i18n.ts).
 */
export const landing = {
  brand: "Ward Academy",
  nav: ["How it works", "Pricing", "FAQ"],
  cta: "Book a free trial",
  login: "Log in",
  menu: "Menu",
  closeMenu: "Close menu",
  hero: {
    title: "Your child's English journey, blooming step by step",
    sub: "A dedicated teacher guides your child through live 1:1 sessions, following their progress step by step. Ages 9–13.",
    note: "Free trial session · no commitment",
    rating: "Loved by 1,000+ families",
    peek: {
      student: "Layan",
    },
  },
  assurances: [
    "Parental consent for every account",
    "Private 1:1 sessions",
    "The same teacher every week",
  ],
  how: {
    title: "How it works",
    steps: [
      { t: "A gentle placement test", d: "We meet your child where they really are — one short, fun session, zero pressure." },
      { t: "One teacher, all the way", d: "Live 1:1 sessions with a teacher who knows your child by name and tends their progress week by week." },
      { t: "An honest Bloom Report", d: "Real numbers: what they truly mastered, and what still needs time and care." },
    ],
  },
  trust: {
    title: "One teacher, one child — every session",
    sub: "Every session is private and one-to-one: your child's full hour of attention, at their own pace, around what they love. The same dedicated teacher follows their journey week after week and shapes each lesson to how they're really doing.",
    points: [
      "Private 1:1 sessions — undivided attention",
      "The same dedicated teacher, every week",
      "Lessons tailored to your child's pace and goals",
    ],
  },
  ai: {
    title: "Smart support that makes every session go further",
    sub: "Behind your child's teacher is thoughtful AI — and your child gets a helping hand too. By supporting both the teacher and the student, it turns every session into more real progress.",
    points: [
      {
        t: "Support for the teacher",
        d: "AI helps the teacher build personalized lessons, practice and progress reports in a fraction of the time — so their energy stays on teaching your child.",
      },
      {
        t: "Support for your child",
        d: "Between sessions, your child gets practice matched to their exact level, and instant, friendly help the moment they need it.",
      },
      {
        t: "A faster journey",
        d: "When a dedicated teacher and smart tools work together, progress compounds — and your child reaches their goals sooner.",
      },
    ],
  },
  showcase: {
    title: "A peek inside",
    sub: "Everything you and your child see — calm, clear, and made for focus.",
    previewLabel: "Preview",
    comingSoon: "Real screens coming soon",
    items: [
      {
        tag: "For parents",
        title: "Your child's progress, always in view",
        desc: "Open your account to a living progress report, a short summary after every session, and what's coming next.",
        points: [
          "A short report after every session",
          "Live progress you can actually read",
          "Your next session at a glance",
        ],
      },
      {
        tag: "For your child",
        title: "One tap into a live 1:1 lesson",
        desc: "A calm, friendly space with their own teacher — no clutter, no distractions, just the two of them.",
        points: [
          "The same teacher, face to face",
          "Playful, focused exercises",
          "Gentle help the moment they need it",
        ],
      },
    ],
  },
  // In-frame mockup copy for the "A peek inside" screens (first names only).
  screens: {
    parent: {
      greeting: "Good morning",
      approved: "Everything here is approved by the teacher",
      tabs: ["Layan", "Omar"],
      childSeason: "Season 2 · A2",
      childTeacher: "with Ms. Sara",
      streak: "7-session streak",
      nextLabel: "Next session",
      nextWhen: "Tomorrow · 4:00 pm",
      note: "Reading is steady; writing still needs a little care — details in the Bloom Report.",
      reportTag: "Latest Bloom Report",
      reportWeek: "Second week of June",
      reportCta: "Read",
    },
    student: {
      greeting: "Hey Layan!",
      next: "Next session with Ms. Sara — tomorrow, 4:00 pm",
      questFrom: "From Ms. Sara",
      questTitle: "Reading Quest · Unit 4",
      questDesc: "Your balloon is inflating — finish to make it pop!",
      questStep: "2 of 3",
      questCta: "Continue quest",
      flowerTitle: "Your skill flower",
      flowerDesc: "The big picture — grows as you finish quests this season.",
      streak: "7-day streak",
      moreTitle: "More quests",
      moreItem: "Speak: My favourite place",
      moreNote: "Record 1 minute · Ms. Sara will listen",
      moreWhen: "Tomorrow",
    },
    teacher: {
      nav: ["Today", "AI reviews", "Students", "Homework", "Reports"],
      reviewTitle: "Awaiting your review",
      reviewNote: "Nothing reaches the student before you approve",
      reviewItems: [
        { t: "Homework · Unit 4 — Reading", s: "Multiple choice · 30 questions" },
        { t: "Feelings vocabulary exercise", s: "Match · 8 words" },
        { t: "Tuesday session summary", s: "Parent report" },
      ],
      reviewCta: "Review & approve",
      todayTitle: "Today's sessions",
      sessions: [
        { name: "Layan", detail: "Season 2 · Unit 4 — Reading", time: "4:00", cta: "Start session" },
        { name: "Omar", detail: "Season 1 · Unit 2 — Vocabulary", time: "5:00", cta: "Prepare" },
        { name: "Nour", detail: "Season 3 · Speaking session", time: "6:30", cta: "Prepare" },
      ],
    },
  },
  bloomReport: {
    tag: "The Bloom Report",
    title: "Watch their English bloom, skill by skill",
    sub: "Each petal is a skill. As your child grows, their flower opens — so progress is something you can see, not just numbers on a page.",
    note: "Updated after every session.",
    streak: "7-session streak",
    season: "Season 2 · A2",
    skills: [
      { name: "Listening", value: 75, tag: "6 of 8" },
      { name: "Speaking", value: 46, tag: "developing" },
      { name: "Reading", value: 90, tag: "9 of 10" },
      { name: "Writing", value: 38, tag: "3 of 8" },
      { name: "Vocabulary", value: 60, tag: "24 of 40" },
    ],
  },
  video: {
    tag: "See it in action",
    title: "A real session, in 90 seconds",
    sub: "See how a lesson feels — warm, personal, and focused on your child.",
    duration: "1:30",
    cta: "Play the tour",
  },
  outcomes: {
    title: "Families are already seeing the difference",
    sub: "Real momentum, from the very first weeks.",
    stats: [
      { value: "9 in 10", label: "parents see more confidence within 6 weeks" },
      { value: "4.9/5", label: "average parent rating" },
      { value: "12,000+", label: "live 1:1 sessions taught" },
      { value: "25+", label: "cities across Europe" },
    ],
  },
  stickyCta: "Book a free trial",
  pricing: {
    title: "Choose how often your child learns",
    sub: "Every plan gives your child the same full experience — the only difference is how many sessions a week. Cancel anytime.",
    badge: "Most chosen",
    perMonth: "/ month",
    includesTitle: "Every plan includes",
    features: [
      "Live 1:1 sessions with a dedicated teacher",
      "A short report after every session",
      "A live progress report in your account",
      "Homework set and checked by the teacher",
      "WhatsApp updates from the teacher",
      "Cancel anytime — no long contracts",
    ],
    note: "Prices in euro · No card needed for the trial",
    plans: [
      {
        name: "Essential",
        price: "€76",
        cadence: "1 session a week",
        sessions: "4 sessions a month",
        featured: false,
      },
      {
        name: "Steady",
        price: "€144",
        cadence: "2 sessions a week",
        sessions: "8 sessions a month",
        featured: true,
      },
      {
        name: "Intensive",
        price: "€204",
        cadence: "3 sessions a week",
        sessions: "12 sessions a month",
        featured: false,
      },
    ],
  },
  testimonials: {
    title: "Parents see the difference",
    sub: "Real families, real change — confidence first.",
    items: [
      {
        quote:
          "My son used to freeze up in English. One-to-one with the same teacher every week, he's finally speaking with confidence.",
        name: "Mona A.",
        city: "Berlin",
      },
      {
        quote:
          "I get a short report after every single session, so I always know what my daughter learned and what's coming next. No guessing.",
        name: "Yusuf K.",
        city: "Vienna",
      },
      {
        quote:
          "Every lesson is built around my son — his level, his interests. The extra practice between sessions keeps him moving faster than I expected.",
        name: "Layla H.",
        city: "Zürich",
      },
    ],
  },
  faq: {
    title: "Questions parents ask",
    sub: "Everything you want to know before the first session.",
    items: [
      {
        q: "How long is each session?",
        a: "Live 1:1 sessions are 45 minutes — long enough to grow, short enough to stay fun and focused.",
      },
      {
        q: "What ages do you teach?",
        a: "We teach children ages 9 to 13, matched to the right level after a gentle placement test.",
      },
      {
        q: "What if my child is shy?",
        a: "That's exactly who we're built for. One steady teacher, one child, and no class to perform in front of — confidence grows session by session.",
      },
      {
        q: "What do we need to start?",
        a: "Just a laptop or tablet with a camera and internet. We send a simple link — nothing to install.",
      },
      {
        q: "Can I cancel anytime?",
        a: "Yes. Plans are monthly — you can pause or cancel whenever you like, with no long contracts.",
      },
      {
        q: "Who teaches my child?",
        a: "A real, qualified teacher — the same one every week. They plan each lesson, guide your child personally, and check their homework and progress themselves.",
      },
    ],
  },
  final: {
    title: "Start with a free trial session",
    sub: "Meet the teacher and see the platform from the inside.",
  },
  footer: {
    tagline: "Confident English for ages 9–13 — teacher-led, AI-supported.",
    exploreTitle: "Explore",
    accountTitle: "Account",
    copyright: "Ward Academy © 2026 · Parental consent required for every account",
  },
};

/** Login screen — VISUAL ONLY (no auth backend). */
export const login = {
  title: "Log in",
  subtitle: "Welcome back — sign in to your account.",
  email: { label: "Email", placeholder: "you@example.com" },
  password: { label: "Password", placeholder: "••••••••" },
  submit: "Log in",
  forgot: "Forgot password?",
  noAccount: "New to Ward Academy?",
  register: "Book a free trial",
  demoNote:
    "This is a preview — accounts aren't live yet. Please book a free trial to get started.",
};

export const signup = {
  eyebrow: "Start today",
  heading: "Book your child's free trial",
  subheading:
    "Tell us a little about your child and we'll arrange a free trial session. A guardian completes this form.",
  fields: {
    guardianName: { label: "Guardian's full name", placeholder: "e.g. Sarah Johnson" },
    email: { label: "Email address", placeholder: "you@example.com" },
    studentName: { label: "Student's first name", placeholder: "e.g. Adam" },
    studentAge: { label: "Student's age", placeholder: "Select age" },
    track: { label: "Learning track", placeholder: "Choose a track" },
  },
  ageOptions: ["9", "10", "11", "12", "13"],
  trackOptions: [
    { value: "school", label: "School support — help with their English class" },
    { value: "cefr", label: "CEFR English — structured levels (A1–C1)" },
    { value: "unsure", label: "Not sure yet — the teacher will advise" },
  ],
  consentLabel:
    "I am the parent or guardian of this child, and I consent to them taking part in a free trial session.",
  submit: "Request my free trial",
  success: "Thank you, we'll be in touch.",
  successDetail:
    "We've noted your interest. A teacher from Ward Academy will reach out to arrange your free trial session.",
  reassurance: "No payment required · Free trial · You can cancel anytime",
};

/**
 * Homepage "starter" — one playful, one-tap question (foot-in-the-door) that
 * hooks attention and routes to /enroll with the goal pre-filled.
 */
export const starter = {
  eyebrow: "Start in 10 seconds",
  heading: "What would your child love to do in English?",
  subheading: "Pick one to begin — it only takes a tap.",
  options: [
    { key: "speaking", emoji: "💬", label: "Chat with confidence", goal: "Build speaking confidence" },
    { key: "school", emoji: "📚", label: "Do great at school", goal: "Support school English class" },
    { key: "general", emoji: "🎮", label: "Enjoy games, shows & books", goal: "Improve general English" },
    { key: "exam", emoji: "🎯", label: "Get ready for an exam", goal: "Prepare for an exam" },
  ],
  cta: "Or just book a free trial",
};

/**
 * Multi-step enrolment flow — VISUAL ONLY (no storage, no account, no real AI).
 * Register → (confirm) → Book a trial → (confirm) → Placement test → Result.
 * The "AI-generated test", "shareable link" and "teacher dashboard" are
 * believable simulations: the test is a fixed bank, the link carries info via
 * URL params (no storage), and the dashboard shows sample data.
 */
export const enroll = {
  steps: ["Register", "Book a trial", "Placement test"],
  back: "Back",
  continue: "Continue",

  register: {
    guardianSection: "About you (parent / guardian)",
    studentSection: "About your child",
    fields: {
      guardianName: { label: "Your full name", placeholder: "e.g. Sarah Johnson" },
      email: { label: "Email address", placeholder: "you@example.com" },
      phone: { label: "Phone / WhatsApp", placeholder: "+49 ..." },
      country: { label: "Country of residence", placeholder: "Select country" },
      city: { label: "City", placeholder: "e.g. Berlin" },
      nationality: { label: "Nationality", placeholder: "e.g. German" },
      studentName: { label: "Child's full name", placeholder: "e.g. Adam Johnson" },
      gender: { label: "Gender", placeholder: "Select" },
      age: { label: "Age", placeholder: "Select age" },
      grade: { label: "School grade / year", placeholder: "Select grade" },
      schoolType: { label: "Type of school", placeholder: "Select school type" },
      englishLevel: { label: "Current English level", placeholder: "Select level" },
      speaking: { label: "Speaking & listening comfort", placeholder: "Select" },
      reading: { label: "Reading & writing comfort", placeholder: "Select" },
      goal: { label: "Main goal", placeholder: "Select main goal" },
      notes: { label: "Anything else we should know? (optional)", placeholder: "Allergies, interests, learning needs…" },
    },
    options: {
      countries: ["Germany", "Austria", "Switzerland", "Netherlands", "France", "Other"],
      genders: ["Boy", "Girl"],
      ages: ["9", "10", "11", "12", "13"],
      grades: [
        "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8",
      ],
      schoolTypes: [
        "Public school",
        "Private school",
        "International school",
        "Home-schooled",
      ],
      englishLevels: [
        "Just starting out",
        "Beginner — knows some words",
        "Elementary — simple sentences",
        "Intermediate — short conversations",
        "Advanced — quite fluent",
      ],
      comfort: ["Not yet", "A little", "Fairly comfortable", "Very comfortable"],
      goals: [
        "Improve general English",
        "Support school English class",
        "Build speaking confidence",
        "Prepare for an exam",
        "Not sure yet — please advise",
      ],
    },
    yearsWord: "years",
    consentLabel:
      "I am the parent or guardian of this child, and I consent to them taking part in a free trial session.",
    submit: "Continue to booking",
    reassurance: "No payment required · Free trial · You can cancel anytime",
  },

  registered: {
    heading: "Registration complete!",
    body: "Lovely — we've got your details. Next, pick a time for your child's free trial session with the teacher.",
    cta: "Book the free trial",
  },

  booking: {
    heading: "Book the free trial",
    subheading: "Choose a slot that suits you — times show in your local timezone.",
    dayLabel: "Choose a day",
    timeLabel: "Choose a time",
    days: [
      { day: "Mon", date: "Jun 15" },
      { day: "Tue", date: "Jun 16" },
      { day: "Wed", date: "Jun 17" },
      { day: "Thu", date: "Jun 18" },
      { day: "Fri", date: "Jun 19" },
    ],
    times: ["4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM"],
    hint: "Select a day and a time to continue",
    submit: "Confirm booking",
  },

  booked: {
    heading: "Trial booked!",
    body: "Your free trial is confirmed. The last step is a short placement test so the teacher can prepare the perfect first lesson.",
    studentNote:
      "The test should be done by the child. If they're not with you now, no problem — send the link and they can do it later.",
    validity: "The test link stays active for 7 days.",
    startNow: "Start the test now",
    later: "Send the link for later",
  },

  test: {
    preparingTitle: "Preparing a personalized test…",
    preparingNote: "Building questions to match the level you told us about.",
    greeting: (name?: string) => (name ? `Hi ${name}!` : "Hi there!"),
    intro: "This short test has 10 questions. Take your time — there's no pass or fail!",
    start: "Start test",
    next: "Next",
    finish: "See my result",
    questionOf: (i: number, n: number) => `Question ${i} of ${n}`,
    questions: [
      { kind: "Grammar", q: "She ___ to school every day.", options: ["go", "goes", "going"], answer: 1 },
      { kind: "Vocabulary", q: "Choose the opposite of “big”.", options: ["small", "tall", "fast"], answer: 0 },
      { kind: "Grammar", q: "Yesterday I ___ a great book.", options: ["read", "reads", "reading"], answer: 0 },
      { kind: "True / False", q: "“A baby cat is called a kitten.”", options: ["True", "False"], answer: 0 },
      { kind: "Spelling", q: "Which word is spelled correctly?", options: ["because", "becuase", "becouse"], answer: 0 },
      { kind: "Grammar", q: "I saw ___ elephant at the zoo.", options: ["an", "a", "the"], answer: 0 },
      { kind: "Grammar", q: "The book is ___ the table.", options: ["on", "in", "at"], answer: 0 },
      { kind: "Vocabulary", q: "One child, two ___.", options: ["childs", "children", "childrens"], answer: 1 },
      { kind: "Reading", q: "Tom has a red ball and a blue kite. What colour is Tom's ball?", options: ["Red", "Blue", "Green"], answer: 0 },
      { kind: "Grammar", q: "Which is a correct question?", options: ["Where you are going?", "Where are you going?", "Where going you are?"], answer: 1 },
    ],
  },

  result: {
    heading: "Test complete!",
    scoreLabel: "Your score",
    levelLabel: "Suggested starting level",
    pendingBadge: "Awaiting teacher approval",
    teacherNote: "The teacher will review this and confirm the final level before your first lesson.",
    bands: [
      { min: 9, title: "Wonderful!", level: "Upper-Intermediate (B2)" },
      { min: 7, title: "Great job!", level: "Intermediate (B1)" },
      { min: 5, title: "Nice work!", level: "Elementary (A2)" },
      { min: 3, title: "Good start!", level: "Beginner (A1)" },
      { min: 0, title: "Great effort!", level: "Just starting (Pre-A1)" },
    ],
    shareHeading: "Share the result",
    backHome: "Back to home",
  },

  share: {
    copy: "Copy link",
    copied: "Copied!",
    whatsapp: "Share on WhatsApp",
    linkMessage: "Here's the Ward Academy placement test for our child: ",
    resultMessage: "Our child finished the Ward Academy placement test! ",
  },
};

/**
 * Teacher dashboard — VISUAL DEMO with sample data only (no backend).
 */
export const teacher = {
  title: "Teacher dashboard",
  subtitle: "New trial registrations and placement status.",
  demoBadge: "Demo · sample data",
  columns: ["Student", "Goal", "Trial session", "Placement test"],
  students: [
    {
      name: "Adam Johnson",
      age: 11,
      grade: "Grade 6",
      schoolType: "Public school",
      goal: "Support school English class",
      level: "Elementary (A2)",
      trial: { day: "Tue Jun 16", time: "5:00 PM" },
      test: "completed",
      score: 7,
    },
    {
      name: "Lina Meyer",
      age: 9,
      grade: "Grade 4",
      schoolType: "International school",
      goal: "Improve general English",
      level: "—",
      trial: { day: "Wed Jun 17", time: "4:00 PM" },
      test: "not_started",
      score: null,
    },
    {
      name: "Omar Khalil",
      age: 13,
      grade: "Grade 8",
      schoolType: "Private school",
      goal: "Prepare for an exam",
      level: "Intermediate (B1)",
      trial: { day: "Fri Jun 19", time: "7:00 PM" },
      test: "completed",
      score: 9,
    },
  ],
  status: {
    completed: "Completed",
    not_started: "Not started",
  },
  shareTestLabel: "Share test link",
};

