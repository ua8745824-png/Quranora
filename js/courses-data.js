/**
 * Quranora - Courses Dataset
 */
const coursesData = [
  {
    id: "nazra-quran",
    category: "kids-quran",
    icon: "📖",
    titleEn: "Nazra Quran",
    titleUr: "ناظرہ قرآن پاک",
    taglineEn: "Learn fluent Quran recitation from Noorani Qaida to full Quran reading.",
    taglineUr: "قرآن پاک صحیح تلفظ اور روانی کے ساتھ پڑھنا سیکھیں۔",
    ageGroup: "Kids (4+) & Beginners",
    duration: "30 Mins / Class",
    featuresEn: [
      "Noorani Qaida foundation with correct Arabic letter phonetics",
      "Step-by-step transition to Surah recitation & fluency",
      "Daily practice with patient, supportive tutors",
      "Regular assessment and graduation certificate"
    ],
    featuresUr: [
      "نورانی قاعدہ سے حروف اور مخارج کی بنیادی پہچان",
      "مکمل روانی اور درست تلفظ کے ساتھ تلاوت کی مشق",
      "بچوں کے لیے آسان اور دلچسپ تدریسی انداز",
      "ماہانہ جائزہ اور حوصلہ افزا اسناد"
    ],
    badge: "Foundation"
  },
  {
    id: "quran-tajweed",
    category: "quran",
    icon: "✨",
    titleEn: "Quran with Tajweed",
    titleUr: "تجوید القرآن الکریم",
    taglineEn: "Master classical articulation points (Makharij), rules of Noon & Meem Sakinah.",
    taglineUr: "مخارج، صفات اور تجوید کے بنیادی و ضروری اصول سیکھیں۔",
    ageGroup: "All Ages (Kids & Adults)",
    duration: "30 Mins / Class",
    featuresEn: [
      "Exact anatomical Makharij (throat, tongue, lips, nasal)",
      "Rules of Madd, Ghunnah, Ikhfa, Idgham, and Qalqalah",
      "Practical application on short & long Surahs",
      "Melodious recitation voice coaching"
    ],
    featuresUr: [
      "حروف کے تمام مخارج اور صفات کی تفصیلی عملی مشق",
      "ادغام، اخفاء، اظہار، اقلاب اور مد کے مستند قواعد",
      "قرآن مجید کے تمام پاروں پر تجوید کا عملی اطلاق",
      "تلاوت میں ترتیل اور لحن جلی/خفی سے مکمل اجتناب"
    ],
    badge: "Most Popular"
  },
  {
    id: "hifz-quran",
    category: "quran",
    icon: "🕌",
    titleEn: "Hifz-ul-Quran (Memorization)",
    titleUr: "حفظ القرآن الکریم",
    taglineEn: "Structured step-by-step Quran memorization with daily Sabqi and Manzil revision.",
    taglineUr: "مرحلہ وار حفظ قرآن، روزانہ سبق اور باقاعدہ revision کے ساتھ۔",
    ageGroup: "Kids (6+) & Adults",
    duration: "30 - 60 Mins / Class",
    featuresEn: [
      "Systematic 3-tier technique (Sabaq, Sabqi, Manzil)",
      "Daily personalized memorization targets & audio guidance",
      "Strict retention checks to prevent forgetting",
      "Flexible full-time or part-time Hifz tracks"
    ],
    featuresUr: [
      "سبق، سبقی اور منزل کا باقاعدہ اور مضبوط نظام",
      "روزانہ نیا سبق سنانا اور پچھلے اسباق کی پختگی",
      "مکمل حفظ یا منتخب سورتوں کے حفظ کا انتخاب",
      "سند یافتہ حفاظِ کرام کی مسلسل نگرانی"
    ],
    badge: "Intensive"
  },
  {
    id: "quran-translation",
    category: "advanced",
    icon: "📜",
    titleEn: "Quran Translation (Tarjuma)",
    titleUr: "ترجمہ قرآن مجید",
    taglineEn: "Word-by-word and contextual translation of the Holy Quran for deep comprehension.",
    taglineUr: "قرآن پاک کے منتخب حصوں کا ترجمہ اور بنیادی مفہوم۔",
    ageGroup: "Teens & Adults",
    duration: "30 - 45 Mins / Class",
    featuresEn: [
      "Word-for-word grammatical breakdown & vocabulary building",
      "Contextual translation of major Surahs & Juz 30",
      "Understanding Divine commands and lessons in daily life",
      "Interactive Q&A discussions on practical takeaways"
    ],
    featuresUr: [
      "لفظی اور بامحاورہ ترجمہ آسان اور عام فہم انداز میں",
      "قرآنی الفاظ کا مفہوم اور قرآنی عربی کی بنیادی واقفیت",
      "احکاماتِ الٰہی کو سمجھ کر روزمرہ زندگی میں اپنانا",
      "نوجوانوں اور بڑوں کے لیے خصوصی فکری رہنمائی"
    ],
    badge: "Understanding"
  },
  {
    id: "quran-tafseer",
    category: "advanced",
    icon: "💡",
    titleEn: "Tafseer-ul-Quran",
    titleUr: "تفسیر القرآن الکریم",
    taglineEn: "Simplified yet profound Quranic exegesis explaining historical contexts & themes.",
    taglineUr: "قرآن پاک کی آیات کو آسان انداز میں سمجھنے کے لیے بنیادی تفسیر۔",
    ageGroup: "Youth & Adults",
    duration: "30 - 45 Mins / Class",
    featuresEn: [
      "Historical causes of revelation (Shan-e-Nuzool)",
      "Classical commentaries adapted for modern daily understanding",
      "Moral, ethical, and spiritual insights of the Quran",
      "Open interactive dialogues with Islamic scholars"
    ],
    featuresUr: [
      "شانِ نزول اور سورتوں کے تاریخی و فکری پس منظر کا بیان",
      "آیات کی آسان اور مدلل تشریح مستند تفاسیر کی روشنی میں",
      "ایمانی و اخلاقی اسباق اور فتنوں کے دور میں قرآنی رہنمائی",
      "سوال و جواب اور اشکالات کا تسلی بخش حل"
    ],
    badge: "Advanced"
  },
  {
    id: "islamic-studies-kids",
    category: "kids",
    icon: "🌟",
    titleEn: "Islamic Studies for Kids",
    titleUr: "اسلامک اسٹڈیز برائے اطفال",
    taglineEn: "Essential Islamic values, daily Duas, Seerah stories, and character building (Akhlaq).",
    taglineUr: "بچوں کے لیے بنیادی اسلامی تعلیمات، دعائیں، احادیث، نماز اور اخلاق۔",
    ageGroup: "Kids (4 to 15 Years)",
    duration: "30 Mins / Class",
    featuresEn: [
      "Stories of the Prophets (Qisas al-Anbiya) & Seerah of Prophet Muhammad ﷺ",
      "Daily Masnoon Duas, Kalimahs, and Hadith for kids",
      "Islamic manners, honesty, respecting parents, and good Akhlaq",
      "Engaging slides, interactive quizzes, and visual stories"
    ],
    featuresUr: [
      "انبیاء کرام کے ایمان افروز قصے اور سیرت النبی ﷺ",
      "روزمرہ کی مسنون دعائیں، چھ کلمے اور بنیادی احادیث",
      "والدین کا احترام، سچائی اور اسلامی آداب و اخلاقیات",
      "رنگین سلائیڈز، کوئز اور دلچسپ ویڈیو لرننگ"
    ],
    badge: "Kids Favorite"
  },
  {
    id: "namaz-course",
    category: "kids-quran",
    icon: "🤲",
    titleEn: "Namaz & Salah Mastery Course",
    titleUr: "مسنون نماز کورس",
    taglineEn: "Learn the accurate Sunnah method of Salah, Wudu, Azan, and essential supplications.",
    taglineUr: "نماز کا صحیح طریقہ، دعائیں، اذکار اور ضروری مسائل۔",
    ageGroup: "All Ages (Kids & Converts)",
    duration: "30 Mins / Class",
    featuresEn: [
      "Step-by-step practical Wudu & Salah according to Sunnah",
      "Accurate pronunciation of Tashahhud, Durood, & Dua-e-Qunoot",
      "Conditions, Arkaan, and common mistakes in prayer",
      "Funeral prayer (Janazah), Eid prayer, and daily Adhkar"
    ],
    featuresUr: [
      "وضو اور نماز کا مسنون و درست طریقہ مرحلہ وار",
      "تکبیر، ثناء، التحیات، درود شریف اور دعائے قنوت کا صحیح تلفظ",
      "نماز کے فرائض، واجبات، سنن اور مفسدات کی وضاحت",
      "نمازِ جنازہ، عیدین اور صبح و شام کے مسنون اذکار"
    ],
    badge: "Essential"
  }
];
