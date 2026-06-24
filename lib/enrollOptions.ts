// Shared option sets + Arabic labels for the enrolment form and the admin view.
// Stored values are stable codes; labels are for display.

import { SKILL_AR, type Skill } from "@/lib/skills";

export type Opt = { value: string; label: string };

// Selectable ages for the student (9–13 — the approved target band).
export const AGES: number[] = Array.from({ length: 5 }, (_, i) => i + 9);

// Comprehensive country list (Arabic) for residence + nationality autocomplete.
export const COUNTRIES_ALL: string[] = [
  // Arab world & Middle East
  "السعودية", "الإمارات", "الكويت", "قطر", "البحرين", "عُمان", "اليمن", "الأردن", "لبنان", "سوريا",
  "فلسطين", "العراق", "مصر", "السودان", "ليبيا", "تونس", "الجزائر", "المغرب", "موريتانيا", "الصومال",
  "جيبوتي", "جزر القمر", "إيران", "تركيا",
  // Europe
  "ألمانيا", "فرنسا", "إيطاليا", "إسبانيا", "البرتغال", "هولندا", "بلجيكا", "السويد", "النرويج", "الدنمارك",
  "فنلندا", "آيسلندا", "المملكة المتحدة", "إيرلندا", "سويسرا", "النمسا", "اليونان", "بولندا", "التشيك", "سلوفاكيا",
  "المجر", "رومانيا", "بلغاريا", "كرواتيا", "صربيا", "سلوفينيا", "البوسنة والهرسك", "الجبل الأسود", "مقدونيا الشمالية", "ألبانيا",
  "كوسوفو", "أوكرانيا", "روسيا", "بيلاروسيا", "ليتوانيا", "لاتفيا", "إستونيا", "مالطا", "قبرص", "لوكسمبورغ",
  "موناكو", "ليختنشتاين", "أندورا", "سان مارينو", "مولدوفا",
  // Americas
  "الولايات المتحدة", "كندا", "المكسيك", "البرازيل", "الأرجنتين", "تشيلي", "كولومبيا", "بيرو", "فنزويلا", "الإكوادور",
  "بوليفيا", "باراغواي", "أوروغواي", "غيانا", "سورينام", "بنما", "كوستاريكا", "نيكاراغوا", "هندوراس", "السلفادور",
  "غواتيمالا", "بليز", "كوبا", "جامايكا", "هايتي", "جمهورية الدومينيكان", "ترينيداد وتوباغو", "الباهاما", "بربادوس",
  // Asia
  "الصين", "اليابان", "كوريا الجنوبية", "كوريا الشمالية", "الهند", "باكستان", "بنغلاديش", "سريلانكا", "نيبال", "بوتان",
  "المالديف", "أفغانستان", "كازاخستان", "أوزبكستان", "تركمانستان", "طاجيكستان", "قيرغيزستان", "أذربيجان", "أرمينيا", "جورجيا",
  "تايلاند", "فيتنام", "كمبوديا", "لاوس", "ميانمار", "ماليزيا", "سنغافورة", "إندونيسيا", "الفلبين", "بروناي",
  "تيمور الشرقية", "منغوليا",
  // Africa (sub-Saharan)
  "نيجيريا", "إثيوبيا", "كينيا", "تنزانيا", "أوغندا", "غانا", "السنغال", "ساحل العاج", "الكاميرون", "جنوب أفريقيا",
  "زيمبابوي", "زامبيا", "أنغولا", "موزمبيق", "الكونغو الديمقراطية", "الكونغو", "الغابون", "تشاد", "النيجر", "مالي",
  "بوركينا فاسو", "غينيا", "سيراليون", "ليبيريا", "توغو", "بنين", "رواندا", "بوروندي", "مدغشقر", "موريشيوس",
  "ملاوي", "بوتسوانا", "ناميبيا", "إريتريا", "جنوب السودان", "الرأس الأخضر", "غامبيا", "غينيا بيساو", "غينيا الاستوائية",
  // Oceania
  "أستراليا", "نيوزيلندا", "فيجي", "بابوا غينيا الجديدة",
  "دولة أخرى",
];

// Nationalities (feminine demonym form — "الجنسية السورية/الألمانية…").
export const NATIONALITIES_ALL: string[] = [
  // Arab world & Middle East
  "سعودية", "إماراتية", "كويتية", "قطرية", "بحرينية", "عُمانية", "يمنية", "أردنية", "لبنانية", "سورية",
  "فلسطينية", "عراقية", "مصرية", "سودانية", "ليبية", "تونسية", "جزائرية", "مغربية", "موريتانية", "صومالية",
  "جيبوتية", "قمرية", "إيرانية", "تركية",
  // Europe
  "ألمانية", "فرنسية", "إيطالية", "إسبانية", "برتغالية", "هولندية", "بلجيكية", "سويدية", "نرويجية", "دنماركية",
  "فنلندية", "آيسلندية", "بريطانية", "إيرلندية", "سويسرية", "نمساوية", "يونانية", "بولندية", "تشيكية", "سلوفاكية",
  "مجرية", "رومانية", "بلغارية", "كرواتية", "صربية", "سلوفينية", "بوسنية", "مونتينيغرية", "مقدونية", "ألبانية",
  "كوسوفية", "أوكرانية", "روسية", "بيلاروسية", "ليتوانية", "لاتفية", "إستونية", "مالطية", "قبرصية", "لوكسمبورغية",
  "موناكية", "ليختنشتاينية", "أندورية", "سان مارينية", "مولدوفية",
  // Americas
  "أمريكية", "كندية", "مكسيكية", "برازيلية", "أرجنتينية", "تشيلية", "كولومبية", "بيروفية", "فنزويلية", "إكوادورية",
  "بوليفية", "باراغوانية", "أوروغوانية", "غيانية", "سورينامية", "بنمية", "كوستاريكية", "نيكاراغوية", "هندوراسية", "سلفادورية",
  "غواتيمالية", "بليزية", "كوبية", "جامايكية", "هايتية", "دومينيكانية", "ترينيدادية", "باهامية", "بربادوسية",
  // Asia
  "صينية", "يابانية", "كورية جنوبية", "كورية شمالية", "هندية", "باكستانية", "بنغلاديشية", "سريلانكية", "نيبالية", "بوتانية",
  "مالديفية", "أفغانية", "كازاخستانية", "أوزبكستانية", "تركمانستانية", "طاجيكستانية", "قيرغيزية", "أذربيجانية", "أرمينية", "جورجية",
  "تايلاندية", "فيتنامية", "كمبودية", "لاوسية", "ميانمارية", "ماليزية", "سنغافورية", "إندونيسية", "فلبينية", "بروناية",
  "تيمورية", "منغولية",
  // Africa
  "نيجيرية", "إثيوبية", "كينية", "تنزانية", "أوغندية", "غانية", "سنغالية", "إيفوارية", "كاميرونية", "جنوب أفريقية",
  "زيمبابوية", "زامبية", "أنغولية", "موزمبيقية", "كونغولية", "غابونية", "تشادية", "نيجرية", "مالية", "بوركينية",
  "غينية", "سيراليونية", "ليبيرية", "توغولية", "بنينية", "رواندية", "بوروندية", "مدغشقرية", "موريشيوسية", "ملاوية",
  "بوتسوانية", "ناميبية", "إريترية", "جنوب سودانية", "كاب فيردية", "غامبية", "غينية بيساوية", "غينية استوائية",
  // Oceania
  "أسترالية", "نيوزيلندية", "فيجية", "بابوية",
  "أخرى",
];

export const SCHOOL_TYPES: Opt[] = [
  { value: "public", label: "مدرسة حكوميّة" },
  { value: "private", label: "مدرسة خاصّة" },
  { value: "homeschool", label: "تعليمٌ منزليّ" },
];

export const GOALS: Opt[] = [
  { value: "general", label: "تقويةٌ عامّة في الإنجليزية" },
  { value: "curriculum", label: "دعمٌ وفق المنهج الدراسيّ" },
  { value: "conversation", label: "تطوير المحادثة والطلاقة" },
  { value: "foundation", label: "تأسيسٌ من البداية للمبتدئين" },
  { value: "exam", label: "التحضير لاختبارٍ أو شهادة" },
];

// Home language(s) — multi-select (a child may live between two languages).
export const HOME_LANGUAGES: string[] = [
  "العربية", "الإنجليزية", "الألمانية", "الفرنسية", "الإسبانية", "الإيطالية", "السويدية", "الهولندية", "أخرى",
];

// Overall self-assessed level.
export const LEVELS: Opt[] = [
  { value: "beginner", label: "مبتدئ" },
  { value: "basic", label: "أساسيّ" },
  { value: "intermediate", label: "متوسّط" },
  { value: "advanced", label: "متقدّم" },
];

// Per-skill self-rating scale (a measure for each of the five skills).
export const SKILL_RATINGS: Opt[] = [
  { value: "weak", label: "ضعيف" },
  { value: "fair", label: "مقبول" },
  { value: "good", label: "جيّد" },
  { value: "excellent", label: "ممتاز" },
];

export const PRIOR_STUDY: Opt[] = [
  { value: "none", label: "لا، فقط المدرسة" },
  { value: "courses", label: "نعم، دورات" },
  { value: "tutor", label: "نعم، معلّم خاصّ" },
  { value: "apps", label: "نعم, تطبيقات/ذاتيّ" },
];

// How much English is part of the child's daily life (academic vs. lived).
export const ENGLISH_USE: Opt[] = [
  { value: "home_school", label: "في البيت والمدرسة يومياً" },
  { value: "school_only", label: "في المدرسة فقط" },
  { value: "sometimes", label: "أحياناً (إعلام، ألعاب، أصدقاء)" },
  { value: "rarely", label: "نادراً — لغته اليومية غير الإنجليزية" },
];

export const RELATIONS: Opt[] = [
  { value: "father", label: "الأب" },
  { value: "mother", label: "الأمّ" },
  { value: "guardian", label: "وصيّ" },
  { value: "other", label: "آخر" },
];

export const REFERRALS: Opt[] = [
  { value: "facebook", label: "فيسبوك" },
  { value: "instagram", label: "إنستغرام" },
  { value: "friend", label: "صديق أو معرفة" },
  { value: "search", label: "بحث Google" },
  { value: "other", label: "مصدرٌ آخر" },
];

// The four assessed skills on the enrolment form (vocabulary excluded here).
export const ENROLL_SKILLS: Skill[] = ["listening", "speaking", "reading", "writing"];
export { SKILL_AR };

// value → label lookups for the admin display.
const toMap = (opts: Opt[]) => Object.fromEntries(opts.map((o) => [o.value, o.label]));
export const LABELS: Record<string, Record<string, string>> = {
  schoolType: toMap(SCHOOL_TYPES),
  goal: toMap(GOALS),
  level: toMap(LEVELS),
  rating: toMap(SKILL_RATINGS),
  priorStudy: toMap(PRIOR_STUDY),
  englishUse: toMap(ENGLISH_USE),
  relation: toMap(RELATIONS),
  referral: toMap(REFERRALS),
};
export const labelOf = (group: keyof typeof LABELS, value?: string | null) =>
  value ? LABELS[group]?.[value] ?? value : "—";

// English labels for the admin view (admin is English by internal decision).
// The enrolment form itself stays Arabic (parent-facing, surface 5).
export const LABELS_EN: Record<string, Record<string, string>> = {
  schoolType: { public: "Public school", private: "Private school", homeschool: "Homeschool" },
  goal: { general: "General English", curriculum: "School-curriculum support", conversation: "Conversation & fluency", foundation: "Beginner foundation", exam: "Exam/certificate prep" },
  level: { beginner: "Beginner", basic: "Basic", intermediate: "Intermediate", advanced: "Advanced" },
  rating: { weak: "Weak", fair: "Fair", good: "Good", excellent: "Excellent" },
  priorStudy: { none: "No, school only", courses: "Yes, courses", tutor: "Yes, private tutor", apps: "Yes, apps/self-study" },
  englishUse: { home_school: "Home & school daily", school_only: "School only", sometimes: "Sometimes (media, games, friends)", rarely: "Rarely — daily language isn't English" },
  relation: { father: "Father", mother: "Mother", guardian: "Guardian", other: "Other" },
  referral: { facebook: "Facebook", instagram: "Instagram", friend: "Friend/acquaintance", search: "Google search", other: "Other source" },
};
export const labelOfEn = (group: keyof typeof LABELS_EN, value?: string | null) =>
  value ? LABELS_EN[group]?.[value] ?? value : "—";

// English suggestion lists for the bilingual enrolment form (parent surface 5).
// Same order as the Arabic lists so the two stay easy to diff.
export const COUNTRIES_EN: string[] = [
  "Saudi Arabia", "United Arab Emirates", "Kuwait", "Qatar", "Bahrain", "Oman", "Yemen", "Jordan", "Lebanon", "Syria",
  "Palestine", "Iraq", "Egypt", "Sudan", "Libya", "Tunisia", "Algeria", "Morocco", "Mauritania", "Somalia",
  "Djibouti", "Comoros", "Iran", "Turkey",
  "Germany", "France", "Italy", "Spain", "Portugal", "Netherlands", "Belgium", "Sweden", "Norway", "Denmark",
  "Finland", "Iceland", "United Kingdom", "Ireland", "Switzerland", "Austria", "Greece", "Poland", "Czechia", "Slovakia",
  "Hungary", "Romania", "Bulgaria", "Croatia", "Serbia", "Slovenia", "Bosnia and Herzegovina", "Montenegro", "North Macedonia", "Albania",
  "Kosovo", "Ukraine", "Russia", "Belarus", "Lithuania", "Latvia", "Estonia", "Malta", "Cyprus", "Luxembourg",
  "Monaco", "Liechtenstein", "Andorra", "San Marino", "Moldova",
  "United States", "Canada", "Mexico", "Brazil", "Argentina", "Chile", "Colombia", "Peru", "Venezuela", "Ecuador",
  "Bolivia", "Paraguay", "Uruguay", "Guyana", "Suriname", "Panama", "Costa Rica", "Nicaragua", "Honduras", "El Salvador",
  "Guatemala", "Belize", "Cuba", "Jamaica", "Haiti", "Dominican Republic", "Trinidad and Tobago", "Bahamas", "Barbados",
  "China", "Japan", "South Korea", "North Korea", "India", "Pakistan", "Bangladesh", "Sri Lanka", "Nepal", "Bhutan",
  "Maldives", "Afghanistan", "Kazakhstan", "Uzbekistan", "Turkmenistan", "Tajikistan", "Kyrgyzstan", "Azerbaijan", "Armenia", "Georgia",
  "Thailand", "Vietnam", "Cambodia", "Laos", "Myanmar", "Malaysia", "Singapore", "Indonesia", "Philippines", "Brunei",
  "Timor-Leste", "Mongolia",
  "Nigeria", "Ethiopia", "Kenya", "Tanzania", "Uganda", "Ghana", "Senegal", "Côte d'Ivoire", "Cameroon", "South Africa",
  "Zimbabwe", "Zambia", "Angola", "Mozambique", "DR Congo", "Congo", "Gabon", "Chad", "Niger", "Mali",
  "Burkina Faso", "Guinea", "Sierra Leone", "Liberia", "Togo", "Benin", "Rwanda", "Burundi", "Madagascar", "Mauritius",
  "Malawi", "Botswana", "Namibia", "Eritrea", "South Sudan", "Cape Verde", "Gambia", "Guinea-Bissau", "Equatorial Guinea",
  "Australia", "New Zealand", "Fiji", "Papua New Guinea",
  "Other country",
];

export const NATIONALITIES_EN: string[] = [
  "Saudi", "Emirati", "Kuwaiti", "Qatari", "Bahraini", "Omani", "Yemeni", "Jordanian", "Lebanese", "Syrian",
  "Palestinian", "Iraqi", "Egyptian", "Sudanese", "Libyan", "Tunisian", "Algerian", "Moroccan", "Mauritanian", "Somali",
  "Djiboutian", "Comoran", "Iranian", "Turkish",
  "German", "French", "Italian", "Spanish", "Portuguese", "Dutch", "Belgian", "Swedish", "Norwegian", "Danish",
  "Finnish", "Icelandic", "British", "Irish", "Swiss", "Austrian", "Greek", "Polish", "Czech", "Slovak",
  "Hungarian", "Romanian", "Bulgarian", "Croatian", "Serbian", "Slovenian", "Bosnian", "Montenegrin", "Macedonian", "Albanian",
  "Kosovar", "Ukrainian", "Russian", "Belarusian", "Lithuanian", "Latvian", "Estonian", "Maltese", "Cypriot", "Luxembourgish",
  "Monégasque", "Liechtensteiner", "Andorran", "Sammarinese", "Moldovan",
  "American", "Canadian", "Mexican", "Brazilian", "Argentine", "Chilean", "Colombian", "Peruvian", "Venezuelan", "Ecuadorian",
  "Bolivian", "Paraguayan", "Uruguayan", "Guyanese", "Surinamese", "Panamanian", "Costa Rican", "Nicaraguan", "Honduran", "Salvadoran",
  "Guatemalan", "Belizean", "Cuban", "Jamaican", "Haitian", "Dominican", "Trinidadian", "Bahamian", "Barbadian",
  "Chinese", "Japanese", "South Korean", "North Korean", "Indian", "Pakistani", "Bangladeshi", "Sri Lankan", "Nepali", "Bhutanese",
  "Maldivian", "Afghan", "Kazakh", "Uzbek", "Turkmen", "Tajik", "Kyrgyz", "Azerbaijani", "Armenian", "Georgian",
  "Thai", "Vietnamese", "Cambodian", "Laotian", "Burmese", "Malaysian", "Singaporean", "Indonesian", "Filipino", "Bruneian",
  "Timorese", "Mongolian",
  "Nigerian", "Ethiopian", "Kenyan", "Tanzanian", "Ugandan", "Ghanaian", "Senegalese", "Ivorian", "Cameroonian", "South African",
  "Zimbabwean", "Zambian", "Angolan", "Mozambican", "Congolese", "Gabonese", "Chadian", "Nigerien", "Malian", "Burkinabè",
  "Guinean", "Sierra Leonean", "Liberian", "Togolese", "Beninese", "Rwandan", "Burundian", "Malagasy", "Mauritian", "Malawian",
  "Botswanan", "Namibian", "Eritrean", "South Sudanese", "Cape Verdean", "Gambian", "Bissau-Guinean", "Equatorial Guinean",
  "Australian", "New Zealander", "Fijian", "Papua New Guinean",
  "Other",
];

// Home-language display labels keyed by the stored (Arabic) value.
export const HOME_LANGUAGES_EN: Record<string, string> = {
  "العربية": "Arabic", "الإنجليزية": "English", "الألمانية": "German", "الفرنسية": "French",
  "الإسبانية": "Spanish", "الإيطالية": "Italian", "السويدية": "Swedish", "الهولندية": "Dutch", "أخرى": "Other",
};
