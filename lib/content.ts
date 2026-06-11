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
} as const;

export const nav = {
  links: [
    { label: "How it works", href: "#how-it-works" },
    { label: "Why Ward", href: "#features" },
    { label: "AI & teacher", href: "#ai" },
    { label: "Safety", href: "#safety" },
  ],
  cta: "Book a free trial",
} as const;

export const hero = {
  eyebrow: "English for ages 8–15",
  titleLines: ["English your child", "learns with", "confidence."],
  highlight: "confidence.",
  subtitle:
    "Teacher-led lessons, supported by AI. Your child gets original, level-matched practice that a real teacher reviews and approves — so progress is real and you can see it.",
  primaryCta: "Book a free trial",
  secondaryCta: "See how it works",
  trustNote: "Free trial session · No payment required · Guardian stays in the loop",
  stats: [
    { value: "8–15", label: "Ages we teach" },
    { value: "1-to-1", label: "Personal attention" },
    { value: "100%", label: "Teacher-approved work" },
  ],
  preview: {
    label: "Today's practice",
    approved: "Teacher approved",
    question: "Choose the correct word:",
    sentence: "She ___ to school every day.",
    options: [
      { text: "go", correct: false },
      { text: "goes", correct: true },
      { text: "going", correct: false },
    ],
    progressLabel: "This week's progress",
    progressValue: "6 of 8",
  },
} as const;

export const features = {
  heading: "Everything your child needs to move forward",
  subheading:
    "A complete learning loop around the lesson — so the teacher can focus on teaching, and you can focus on watching your child grow.",
  cards: [
    {
      icon: "sparkles",
      title: "Original AI practice, matched to their level",
      body: "Fresh exercises generated for your child's exact level and goals — never copied, always relevant and engaging.",
      accent: "brand",
    },
    {
      icon: "chart",
      title: "Progress tracking & clear reports",
      body: "Attendance, scores and strengths by skill — shown honestly (\"6 of 8\"), with a friendly summary after every session.",
      accent: "coral",
    },
    {
      icon: "teacher",
      title: "Teacher-led, AI-supported",
      body: "A real teacher plans, reviews and approves everything. AI saves time; the teacher guarantees the quality.",
      accent: "brand",
    },
    {
      icon: "shield-eye",
      title: "Guardian visibility",
      body: "A read-only view of your child's progress, scores and reports — for every child you care for, all in one place.",
      accent: "coral",
    },
  ],
} as const;

export const howItWorks = {
  heading: "How it works",
  subheading: "Four simple steps from hello to confident learning.",
  steps: [
    {
      number: "01",
      title: "Register",
      body: "You fill in a short form and give consent. Takes a couple of minutes.",
    },
    {
      number: "02",
      title: "Free trial session",
      body: "Pick a time that suits you. Your child meets their teacher one-to-one.",
    },
    {
      number: "03",
      title: "Personalized plan",
      body: "After a quick placement, the teacher builds a plan made for your child.",
    },
    {
      number: "04",
      title: "Learn with follow-up",
      body: "Lessons, practice and reports — with progress you can actually see.",
    },
  ],
} as const;

export const ai = {
  eyebrow: "AI, done responsibly",
  heading: "AI helps. The teacher guarantees quality.",
  body: "Every exercise and assessment is generated as a draft. A real teacher reviews and approves it before it ever reaches your child. Nothing automatic is sent unchecked — that is our promise.",
  pipeline: [
    {
      title: "AI generates",
      body: "Original exercises and assessments, matched to your child's level and goals.",
      icon: "sparkles",
    },
    {
      title: "Teacher reviews & approves",
      body: "A real teacher checks every draft for quality and fit — and approves it.",
      icon: "check-badge",
    },
    {
      title: "Your child learns",
      body: "Only approved, teacher-trusted work reaches your child. Always.",
      icon: "graduation",
    },
  ],
} as const;

export const safety = {
  eyebrow: "Built for peace of mind",
  heading: "Safe by design, for children and parents",
  body: "Ward Academy is built around the guardian — you stay in the loop on everything your child does.",
  points: [
    {
      icon: "teacher",
      title: "Teacher-led",
      body: "A qualified teacher leads every step. Technology supports them — it never replaces them.",
    },
    {
      icon: "shield-eye",
      title: "Guardian in the loop",
      body: "No private adult-to-child channel. You register, you consent, and you can always see what's happening.",
    },
    {
      icon: "lock",
      title: "Child-safe & private",
      body: "We collect only what we need, store data in the EU (GDPR), and keep your family's information protected.",
    },
  ],
} as const;

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
  ageOptions: ["8", "9", "10", "11", "12", "13", "14", "15"],
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
} as const;

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
      ages: ["8", "9", "10", "11", "12", "13", "14", "15"],
      grades: [
        "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7",
        "Grade 8", "Grade 9", "Grade 10",
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
    greeting: (name?: string) => (name ? `Hi ${name}! 👋` : "Hi there! 👋"),
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
    heading: "Test complete! 🎉",
    scoreLabel: "Your score",
    levelLabel: "Suggested starting level",
    teacherNote: "The teacher will review this and confirm the final level before your first lesson.",
    bands: [
      { min: 9, title: "Wonderful! ✨", level: "Upper-Intermediate (B2)" },
      { min: 7, title: "Great job! 🎉", level: "Intermediate (B1)" },
      { min: 5, title: "Nice work! 👍", level: "Elementary (A2)" },
      { min: 3, title: "Good start! 🌱", level: "Beginner (A1)" },
      { min: 0, title: "Great effort! 💪", level: "Just starting (Pre-A1)" },
    ],
    shareHeading: "Share the result",
    backHome: "Back to home",
  },

  share: {
    copy: "Copy link",
    copied: "Copied!",
    whatsapp: "Share on WhatsApp",
    linkMessage: "Here's the Ward Academy placement test for our child: ",
    resultMessage: "Our child finished the Ward Academy placement test! 🌟 ",
  },
} as const;

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
      age: 14,
      grade: "Grade 9",
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
} as const;

export const footer = {
  tagline: "Confident English for young learners — teacher-led, AI-supported.",
  columns: [
    {
      title: "Learn",
      links: [
        { label: "How it works", href: "#how-it-works" },
        { label: "Why Ward", href: "#features" },
        { label: "AI & teacher", href: "#ai" },
      ],
    },
    {
      title: "Trust",
      links: [
        { label: "Safety", href: "#safety" },
        { label: "Book a free trial", href: "#signup" },
      ],
    },
  ],
  note: "Built for guardians and young learners.",
  legal: "Hosted in the EU · GDPR-aware · Guardian-anchored.",
} as const;
