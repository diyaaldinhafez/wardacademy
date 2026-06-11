/**
 * Bilingual dictionary (Arabic + English) for the landing page and enrolment
 * flow. Arabic is the default; the language switcher toggles content + dir + font.
 *
 * English (`en`) reuses the existing copy from content.ts (the single EN source).
 * Arabic (`ar`) mirrors the exact shape. Note: the English-learning CONTENT
 * itself (the placement-test questions and the hero exercise sentence/options)
 * stays in English in both languages — only the surrounding UI is translated.
 *
 * Internal pages (/teacher, /brand) stay English and read content.ts directly.
 */
import {
  site,
  nav,
  hero,
  features,
  howItWorks,
  ai,
  safety,
  signup,
  starter,
  enroll,
  footer,
} from "./content";

export type Lang = "ar" | "en";

const en = {
  site,
  nav,
  hero,
  features,
  howItWorks,
  ai,
  safety,
  signup: { heading: signup.heading, subheading: signup.subheading },
  starter,
  enroll,
  footer,
  ui: {
    langName: "EN",
    backHome: "Back to home",
    placementPageNote:
      "A short English placement test from Ward Academy — best done by the child.",
  },
};

export type Dict = typeof en;

const ar: Dict = {
  site: {
    name: "Ward Academy",
    tagline: "إنجليزيةٌ بثقة، بقيادة المعلّم ومدعومةٌ بالذكاء الاصطناعي",
    primaryCta: "احجز جلسة تجريبية مجانية",
    secondaryCta: "كيف تعمل المنصّة",
  },
  nav: {
    links: [
      { label: "كيف تعمل", href: "#how-it-works" },
      { label: "لماذا Ward", href: "#features" },
      { label: "الذكاء والمعلّم", href: "#ai" },
      { label: "الأمان", href: "#safety" },
    ],
    cta: "احجز جلسة مجانية",
  },
  hero: {
    eyebrow: "إنجليزيةٌ للأعمار 8–15",
    titleLines: ["إنجليزيةٌ يتعلّمها طفلك", "بثقة."],
    highlight: "بثقة.",
    subtitle:
      "دروسٌ بقيادة المعلّم ومدعومةٌ بالذكاء الاصطناعي. يحصل طفلك على تمارين أصليةٍ مناسبةٍ لمستواه، يراجعها معلّمٌ حقيقيٌّ ويعتمدها — فالتقدّم حقيقيٌّ وأنت تراه.",
    primaryCta: "احجز جلسة تجريبية مجانية",
    secondaryCta: "كيف تعمل المنصّة",
    trustNote: "جلسة تجريبية مجانية · بلا دفع · وليّ الأمر في الصورة دائماً",
    stats: [
      { value: "8–15", label: "الأعمار التي نعلّمها" },
      { value: "1-to-1", label: "اهتمامٌ فرديّ" },
      { value: "100%", label: "عملٌ معتمَدٌ من المعلّم" },
    ],
    preview: {
      label: "تمرين اليوم",
      approved: "معتمَد من المعلّم",
      question: "اختر الكلمة الصحيحة:",
      sentence: "She ___ to school every day.",
      options: [
        { text: "go", correct: false },
        { text: "goes", correct: true },
        { text: "going", correct: false },
      ],
      progressLabel: "تقدّم هذا الأسبوع",
      progressValue: "6 من 8",
    },
  },
  features: {
    heading: "كل ما يحتاجه طفلك ليتقدّم",
    subheading:
      "حلقةٌ تعليميةٌ متكاملةٌ حول الدرس — ليتفرّغ المعلّم للتعليم، وتتفرّغ أنت لمتابعة نموّ طفلك.",
    cards: [
      {
        icon: "sparkles",
        title: "تمارين أصليّة بالذكاء الاصطناعي، مناسبةٌ لمستواه",
        body: "تمارين جديدةٌ تُولَّد لمستوى طفلك وأهدافه بالضبط — لا نسخ، دائماً مفيدةٌ وممتعة.",
        accent: "brand",
      },
      {
        icon: "chart",
        title: "تتبّع التقدّم وتقارير واضحة",
        body: "الحضور والدرجات ونقاط القوّة حسب المهارة — معروضةٌ بصدق («6 من 8»)، مع ملخّصٍ ودودٍ بعد كل جلسة.",
        accent: "coral",
      },
      {
        icon: "teacher",
        title: "بقيادة المعلّم، بدعم الذكاء",
        body: "معلّمٌ حقيقيٌّ يخطّط ويراجع ويعتمد كل شيء. الذكاء يوفّر الوقت، والمعلّم يضمن الجودة.",
        accent: "brand",
      },
      {
        icon: "shield-eye",
        title: "اطّلاع وليّ الأمر",
        body: "لوحةٌ للقراءة فقط لتقدّم طفلك ودرجاته وتقاريره — لكل طفلٍ ترعاه، في مكانٍ واحد.",
        accent: "coral",
      },
    ],
  },
  howItWorks: {
    heading: "كيف تعمل",
    subheading: "أربع خطواتٍ بسيطة من الترحيب إلى التعلّم بثقة.",
    steps: [
      { number: "01", title: "سجّل", body: "تملأ نموذجاً قصيراً وتمنح الموافقة. دقيقتان فقط." },
      { number: "02", title: "جلسة تجريبية مجانية", body: "اختر وقتاً يناسبك. يلتقي طفلك بمعلّمه وجهاً لوجه." },
      { number: "03", title: "خطّة مخصّصة", body: "بعد تحديدٍ سريعٍ للمستوى، يبني المعلّم خطّةً مصمّمةً لطفلك." },
      { number: "04", title: "تعلّم مع متابعة", body: "دروسٌ وتمارين وتقارير — بتقدّمٍ تراه فعلاً." },
    ],
  },
  ai: {
    eyebrow: "ذكاءٌ اصطناعيٌّ بمسؤولية",
    heading: "الذكاء يساعد. والمعلّم يضمن الجودة.",
    body: "كل تمرينٍ وتقييمٍ يُولَّد كمسوّدة. يراجعه معلّمٌ حقيقيٌّ ويعتمده قبل أن يصل طفلك. لا يصل شيءٌ آليٌّ دون مراجعة — هذا وعدنا.",
    pipeline: [
      {
        title: "الذكاء يولّد",
        body: "تمارين وتقييماتٌ أصلية، مناسبةٌ لمستوى طفلك وأهدافه.",
        icon: "sparkles",
      },
      {
        title: "المعلّم يراجع ويعتمد",
        body: "معلّمٌ حقيقيٌّ يفحص كل مسوّدةٍ للجودة والملاءمة ثم يعتمدها.",
        icon: "check-badge",
      },
      {
        title: "طفلك يتعلّم",
        body: "لا يصل طفلك إلا عملٌ معتمَدٌ موثوقٌ من المعلّم. دائماً.",
        icon: "graduation",
      },
    ],
  },
  safety: {
    eyebrow: "راحة بالٍ بالتصميم",
    heading: "آمنٌ بالتصميم، للأطفال والآباء",
    body: "Ward Academy مبنيٌّ حول وليّ الأمر — تبقى مطّلعاً على كل ما يفعله طفلك.",
    points: [
      {
        icon: "teacher",
        title: "بقيادة المعلّم",
        body: "معلّمٌ مؤهّلٌ يقود كل خطوة. التقنية تخدمه ولا تستبدله أبداً.",
      },
      {
        icon: "shield-eye",
        title: "وليّ الأمر في الصورة",
        body: "لا قناة خاصّةً بين بالغٍ وطفل. أنت تسجّل، وتمنح الموافقة، وترى ما يجري دائماً.",
      },
      {
        icon: "lock",
        title: "آمنٌ للطفل وخصوصيّ",
        body: "نجمع فقط ما نحتاجه، ونخزّن البيانات في الاتحاد الأوروبي (GDPR)، ونحمي معلومات عائلتك.",
      },
    ],
  },
  signup: {
    heading: "احجز جلسة طفلك التجريبية المجانية",
    subheading:
      "أخبرنا قليلاً عن طفلك وسنرتّب جلسةً تجريبيةً مجانية. يُكمل وليّ الأمر هذا النموذج.",
  },
  starter: {
    eyebrow: "ابدأ في 10 ثوانٍ",
    heading: "ماذا يحبّ طفلك أن يفعل بالإنجليزية؟",
    subheading: "اختر واحداً لتبدأ — بنقرةٍ واحدة فقط.",
    options: [
      { key: "speaking", emoji: "💬", label: "يتحدّث بثقة", goal: "بناء الثقة في المحادثة" },
      { key: "school", emoji: "📚", label: "يتفوّق في المدرسة", goal: "دعم مادّة الإنجليزية المدرسية" },
      { key: "general", emoji: "🎮", label: "يستمتع بالألعاب والأفلام والكتب", goal: "تحسين الإنجليزية العامّة" },
      { key: "exam", emoji: "🎯", label: "يستعدّ لامتحان", goal: "التحضير لامتحان" },
    ],
    cta: "أو احجز جلسة مجانية مباشرةً",
  },
  enroll: {
    steps: ["التسجيل", "حجز الموعد", "اختبار المستوى"],
    back: "رجوع",
    continue: "متابعة",
    register: {
      guardianSection: "عنك (وليّ الأمر)",
      studentSection: "عن طفلك",
      fields: {
        guardianName: { label: "اسمك الكامل", placeholder: "مثال: سارة جونسون" },
        email: { label: "البريد الإلكتروني", placeholder: "you@example.com" },
        phone: { label: "الهاتف / واتساب", placeholder: "+49 ..." },
        country: { label: "بلد الإقامة", placeholder: "اختر البلد" },
        city: { label: "المدينة", placeholder: "مثال: برلين" },
        nationality: { label: "الجنسية", placeholder: "مثال: ألماني" },
        studentName: { label: "اسم الطفل الكامل", placeholder: "مثال: آدم جونسون" },
        gender: { label: "الجنس", placeholder: "اختر" },
        age: { label: "العمر", placeholder: "اختر العمر" },
        grade: { label: "الصفّ الدراسي", placeholder: "اختر الصفّ" },
        schoolType: { label: "نوع المدرسة", placeholder: "اختر نوع المدرسة" },
        englishLevel: { label: "مستوى الإنجليزية الحالي", placeholder: "اختر المستوى" },
        speaking: { label: "الراحة في المحادثة والاستماع", placeholder: "اختر" },
        reading: { label: "الراحة في القراءة والكتابة", placeholder: "اختر" },
        goal: { label: "الهدف الأساسي", placeholder: "اختر الهدف الأساسي" },
        notes: { label: "أيّ شيءٍ آخر نحتاج معرفته؟ (اختياري)", placeholder: "حساسيات، اهتمامات، احتياجات تعلّم…" },
      },
      options: {
        countries: ["ألمانيا", "النمسا", "سويسرا", "هولندا", "فرنسا", "أخرى"],
        genders: ["ولد", "بنت"],
        ages: ["8", "9", "10", "11", "12", "13", "14", "15"],
        grades: [
          "الصف 3", "الصف 4", "الصف 5", "الصف 6", "الصف 7",
          "الصف 8", "الصف 9", "الصف 10",
        ],
        schoolTypes: ["مدرسة حكومية", "مدرسة خاصّة", "مدرسة دولية", "تعليم منزليّ"],
        englishLevels: [
          "في البداية",
          "مبتدئ — يعرف بعض الكلمات",
          "أساسيّ — جملٌ بسيطة",
          "متوسّط — محادثاتٌ قصيرة",
          "متقدّم — طليقٌ نسبياً",
        ],
        comfort: ["ليس بعد", "قليلاً", "مرتاحٌ نوعاً ما", "مرتاحٌ جداً"],
        goals: [
          "تحسين الإنجليزية العامّة",
          "دعم مادّة الإنجليزية المدرسية",
          "بناء الثقة في المحادثة",
          "التحضير لامتحان",
          "غير متأكّد — أرشدوني",
        ],
      },
      yearsWord: "سنة",
      consentLabel:
        "أنا وليّ أمر هذا الطفل، وأوافق على مشاركته في جلسةٍ تجريبيةٍ مجانية.",
      submit: "متابعة إلى الحجز",
      reassurance: "بلا دفع · جلسة تجريبية مجانية · يمكنك الإلغاء في أيّ وقت",
    },
    registered: {
      heading: "اكتمل التسجيل!",
      body: "رائع — وصلتنا بياناتك. الآن اختر وقتاً لجلسة طفلك التجريبية المجانية مع المعلّم.",
      cta: "احجز الجلسة المجانية",
    },
    booking: {
      heading: "احجز الجلسة التجريبية",
      subheading: "اختر موعداً يناسبك — تظهر الأوقات بتوقيتك المحلّي.",
      dayLabel: "اختر يوماً",
      timeLabel: "اختر وقتاً",
      days: [
        { day: "الإثنين", date: "15 يونيو" },
        { day: "الثلاثاء", date: "16 يونيو" },
        { day: "الأربعاء", date: "17 يونيو" },
        { day: "الخميس", date: "18 يونيو" },
        { day: "الجمعة", date: "19 يونيو" },
      ],
      times: ["4:00 م", "5:00 م", "6:00 م", "7:00 م"],
      hint: "اختر يوماً ووقتاً للمتابعة",
      submit: "تأكيد الحجز",
    },
    booked: {
      heading: "تمّ حجز الجلسة!",
      body: "تأكّدت جلستك التجريبية المجانية. الخطوة الأخيرة اختبار تحديد مستوى قصير ليُعدّ المعلّم أفضل درسٍ أوّل.",
      studentNote:
        "يُفضَّل أن يحلّ الاختبارَ الطفلُ نفسه. إن لم يكن معك الآن فلا مشكلة — أرسل الرابط ليحلّه لاحقاً.",
      validity: "يبقى رابط الاختبار فعّالاً لمدّة 7 أيام.",
      startNow: "ابدأ الاختبار الآن",
      later: "أرسل الرابط لاحقاً",
    },
    test: {
      preparingTitle: "نُجهّز اختباراً مخصّصاً…",
      preparingNote: "نبني أسئلةً تناسب المستوى الذي أخبرتنا به.",
      greeting: (name?: string) => (name ? `مرحباً ${name}! 👋` : "مرحباً! 👋"),
      intro: "هذا اختبارٌ قصيرٌ من 10 أسئلة. خذ وقتك — لا نجاح ولا رسوب!",
      start: "ابدأ الاختبار",
      next: "التالي",
      finish: "أظهر نتيجتي",
      questionOf: (i: number, n: number) => `السؤال ${i} من ${n}`,
      questions: enroll.test.questions,
    },
    result: {
      heading: "اكتمل الاختبار! 🎉",
      scoreLabel: "نتيجتك",
      levelLabel: "المستوى المقترَح للبدء",
      teacherNote: "سيراجع المعلّم هذا ويعتمد المستوى النهائي قبل أوّل درس.",
      bands: [
        { min: 9, title: "رائع! ✨", level: "فوق المتوسّط (B2)" },
        { min: 7, title: "أحسنت! 🎉", level: "متوسّط (B1)" },
        { min: 5, title: "عملٌ جيّد! 👍", level: "أساسيّ (A2)" },
        { min: 3, title: "بدايةٌ طيّبة! 🌱", level: "مبتدئ (A1)" },
        { min: 0, title: "مجهودٌ رائع! 💪", level: "في البداية (Pre-A1)" },
      ],
      shareHeading: "شارك النتيجة",
      backHome: "العودة للرئيسية",
    },
    share: {
      copy: "نسخ الرابط",
      copied: "تم النسخ!",
      whatsapp: "مشاركة عبر واتساب",
      linkMessage: "هذا اختبار تحديد المستوى من Ward Academy لطفلنا: ",
      resultMessage: "أكمل طفلنا اختبار تحديد المستوى في Ward Academy! 🌟 ",
    },
  },
  footer: {
    tagline: "إنجليزيةٌ بثقة لمتعلّمين صغار — بقيادة المعلّم ومدعومةٌ بالذكاء.",
    columns: [
      {
        title: "تعلّم",
        links: [
          { label: "كيف تعمل", href: "#how-it-works" },
          { label: "لماذا Ward", href: "#features" },
          { label: "الذكاء والمعلّم", href: "#ai" },
        ],
      },
      {
        title: "ثقة",
        links: [
          { label: "الأمان", href: "#safety" },
          { label: "احجز جلسة مجانية", href: "/enroll" },
        ],
      },
    ],
    note: "صُمِّم لأولياء الأمور والمتعلّمين الصغار.",
    legal: "مستضافٌ في الاتحاد الأوروبي · متوافقٌ مع GDPR · مرتكزٌ على وليّ الأمر.",
  },
  ui: {
    langName: "ع",
    backHome: "العودة للرئيسية",
    placementPageNote:
      "اختبار تحديد مستوى قصير في الإنجليزية من Ward Academy — يُفضَّل أن يحلّه الطفل.",
  },
};

export const dictionaries: Record<Lang, Dict> = { ar, en };
