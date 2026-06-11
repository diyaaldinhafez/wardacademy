/**
 * Bilingual dictionary (Arabic + English). Arabic is the default; the switcher
 * toggles content + dir + font. English (`en`) reuses content.ts (the EN source);
 * Arabic (`ar`) mirrors the exact shape.
 *
 * The English-learning CONTENT itself (placement-test questions) stays English in
 * both languages — only surrounding UI is translated. Internal pages
 * (/teacher, /brand) stay English and read content.ts directly.
 */
import { site, landing, signup, starter, enroll } from "./content";

export type Lang = "ar" | "en";

const en = {
  site,
  landing,
  signup: { heading: signup.heading, subheading: signup.subheading },
  starter,
  enroll,
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
  landing: {
    brand: "أكاديمية وَرد",
    nav: ["كيف نعمل", "المعلّمون", "الأسعار"],
    cta: "احجز جلسة تجريبية مجانية",
    login: "تسجيل الدخول",
    hero: {
      title: "رحلة ابنك مع الإنجليزية تتفتّح خطوة بخطوة",
      sub: "معلّم خاص في جلسات فردية مباشرة، وذكاء اصطناعي يساعد المعلّم — لا يحلّ مكانه. لأعمار ٩ إلى ١٣.",
      note: "جلسة تجريبية مجانية · بلا التزام",
    },
    how: {
      title: "كيف نعمل؟",
      steps: [
        { t: "اختبار تحديد مستوى لطيف", d: "نتعرّف على مستوى ابنك الحقيقي في جلسة قصيرة ممتعة — بلا توتر." },
        { t: "معلّم واحد يرافقه", d: "جلسات فردية مباشرة مع معلّم يعرف ابنك بالاسم، ويرعى تقدّمه أسبوعاً بأسبوع." },
        { t: "تقرير تفتّح صادق", d: "تصلكم أرقام حقيقية: ما الذي أتقنه فعلاً، وما الذي يحتاج وقتاً ورعاية." },
      ],
    },
    trust: {
      title: "الذكاء الاصطناعي يساعد… والمعلّم يضمن",
      sub: "كل ما ينتجه الذكاء الاصطناعي — واجب، تمرين، تقرير — يبقى مسودة حتى يراجعه المعلّم ويعتمده. لا يصل لابنك أو إليكم شيء لم تره عين بشرية.",
      draft: "مسودة ذكية — بانتظار موافقة المعلّم",
      approved: "اعتمدها المعلّم",
      draftCap: "هكذا تبدو المسودة",
      approvedCap: "وهكذا يبدو المعتمد",
    },
    skills: {
      title: "خمس بتلات = خمس مهارات",
      sub: "الاستماع، المحادثة، القراءة، الكتابة، والمفردات — زهرة ابنك تتفتّح بتلةً بتلة مع تقدّمه الحقيقي.",
      items: ["الاستماع", "المحادثة", "القراءة", "الكتابة", "المفردات"],
    },
    final: {
      title: "ابدؤوا بجلسة تجريبية مجانية",
      sub: "تعرّفوا على المعلّم، وشاهدوا كيف تعمل المنصة من الداخل.",
    },
    footer: "أكاديمية وَرد © ٢٠٢٦ · موافقة وليّ الأمر شرط لكل حساب",
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
  ui: {
    langName: "ع",
    backHome: "العودة للرئيسية",
    placementPageNote:
      "اختبار تحديد مستوى قصير في الإنجليزية من Ward Academy — يُفضَّل أن يحلّه الطفل.",
  },
};

export const dictionaries: Record<Lang, Dict> = { ar, en };
