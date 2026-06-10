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
      accent: "amber",
    },
    {
      icon: "shield-eye",
      title: "Guardian visibility",
      body: "A read-only view of your child's progress, scores and reports — for every child you care for, all in one place.",
      accent: "brand",
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
