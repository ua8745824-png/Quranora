/**
 * Quranora - Global Multi-Currency Pricing Dataset
 */
const pricingData = {
  currencies: {
    USD: { symbol: "$", label: "USD ($ - United States / Global)", code: "USD", flag: "🇺🇸" },
    GBP: { symbol: "£", label: "GBP (£ - United Kingdom)", code: "GBP", flag: "🇬🇧" },
    CAD: { symbol: "CA$", label: "CAD ($ - Canada)", code: "CAD", flag: "🇨🇦" },
    AUD: { symbol: "AU$", label: "AUD ($ - Australia)", code: "AUD", flag: "🇦🇺" },
    AED: { symbol: "AED ", label: "AED (د.إ - UAE & Gulf)", code: "AED", flag: "🇦🇪" },
    EUR: { symbol: "€", label: "EUR (€ - Europe)", code: "EUR", flag: "🇪🇺" },
    PKR: { symbol: "₨ ", label: "PKR (₨ - Pakistan)", code: "PKR", flag: "🇵🇰" }
  },
  plans: {
    basic: {
      id: "basic",
      nameEn: "Basic Plan",
      nameUr: "بیسک پلان",
      badgeEn: "Starter",
      badgeUr: "ابتدائی",
      daysPerWeek: "3 Classes / Week",
      daysPerWeekUr: "ہفتے میں 3 کلاسز",
      duration: "30 Mins / Class",
      durationUr: "30 منٹ فی کلاس",
      classesPerMonth: "12 Live Classes / Month",
      classesPerMonthUr: "ماہانہ 12 لائیو کلاسز",
      recommended: false,
      rates: {
        USD: 35,
        GBP: 28,
        CAD: 45,
        AUD: 50,
        AED: 130,
        EUR: 32,
        PKR: 4500
      },
      featuresEn: [
        "1-on-1 Private Live Session",
        "30 Minutes Duration per Class",
        "Choose Preferred Days (Mon/Wed/Fri etc.)",
        "Male or Female Dedicated Tutor",
        "Weekly Progress Evaluation",
        "Free 3-Day Introductory Trial"
      ],
      featuresUr: [
        "ون ٹو ون انفرادی لائیو کلاس",
        "30 منٹ دورانیہ فی کلاس",
        "اپنی مرضی کے دن منتخب کریں",
        "مرد یا خاتون استاد کا انتخاب",
        "ہفتہ وار جائزہ اور رہنمائی",
        "3 روزہ مفت ٹرائل کلاس"
      ]
    },
    standard: {
      id: "standard",
      nameEn: "Standard Plan",
      nameUr: "اسٹینڈرڈ پلان",
      badgeEn: "Most Popular",
      badgeUr: "سب سے مقبول",
      daysPerWeek: "5 Classes / Week",
      daysPerWeekUr: "ہفتے میں 5 کلاسز",
      duration: "30 Mins / Class",
      durationUr: "30 منٹ فی کلاس",
      classesPerMonth: "20 Live Classes / Month",
      classesPerMonthUr: "ماہانہ 20 لائیو کلاسز",
      recommended: true,
      rates: {
        USD: 50,
        GBP: 40,
        CAD: 65,
        AUD: 75,
        AED: 185,
        EUR: 45,
        PKR: 6500
      },
      featuresEn: [
        "1-on-1 Dedicated Session",
        "5 Days a Week (Mon to Fri)",
        "Faster Fluency & Consistent Routine",
        "Male or Female Certified Tutor",
        "Monthly Written Progress Report",
        "Class Rescheduling Flexibility",
        "Tajweed & Course Completion Certificate"
      ],
      featuresUr: [
        "ون ٹو ون انفرادی کلاس",
        "پیر تا جمعہ (ہفتے میں 5 دن)",
        "تیز رفتار روانی اور روزانہ مشق",
        "مستند قاری صاحب یا معلمہ",
        "ماہانہ تحریری رپورٹ برائے والدین",
        "کلاس ری شیڈول کرنے کی سہولت",
        "کورس مکمل کرنے پر سند"
      ]
    },
    premium: {
      id: "premium",
      nameEn: "Intensive / Hifz Plan",
      nameUr: "پریمیم / حفظ پلان",
      badgeEn: "Intensive",
      badgeUr: "حفظ و خصوصی",
      daysPerWeek: "Custom Schedule (Daily)",
      daysPerWeekUr: "روزانہ / حسب ضرورت شیڈول",
      duration: "45-60 Mins / Class",
      durationUr: "45 تا 60 منٹ فی کلاس",
      classesPerMonth: "24-26 Live Classes / Month",
      classesPerMonthUr: "ماہانہ 24 تا 26 کلاسز",
      recommended: false,
      rates: {
        USD: 85,
        GBP: 68,
        CAD: 110,
        AUD: 125,
        AED: 310,
        EUR: 78,
        PKR: 11000
      },
      featuresEn: [
        "Full-time Hifz or Advanced Tajweed",
        "Extended 45-60 Min Intensive Class",
        "Senior Hafiz/Alim Mentor Supervision",
        "Daily Sabaq, Sabqi & Manzil Tracking",
        "Parent-Coordinator Direct WhatsApp Line",
        "Quarterly Quran Memorization Sanad"
      ],
      featuresUr: [
        "حفظِ قرآن یا ایڈوانس تجوید کے لیے خصوصی",
        "45 سے 60 منٹ کی تفصیلی کلاس",
        "سینئر مفتی و قاری صاحب کی براہِ راست نگرانی",
        "روزانہ سبق، سبقی اور منزل کا ریکارڈ",
        "والدین کے لیے ڈائریکٹ کوآرڈینیٹر سپورٹ",
        "تکمیلِ حفظ پر باضابطہ سند"
      ]
    }
  },
  isTrialPricingUnlocked: function(user) {
    if (!user) return false;
    return (user.trialDay && Number(user.trialDay) >= 3) || user.trialCompleted === true;
  }
};
