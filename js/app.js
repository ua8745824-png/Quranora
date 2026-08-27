/**
 * Quranora Online Quran Academy - Main Application Controller
 */

// Application State
const appState = {
  currentLang: localStorage.getItem("quranora_lang") || "en",
  currentCurrency: localStorage.getItem("quranora_currency") || "USD",
  currentCourseFilter: "all",
  currentTeacherFilter: "all",
  hasSiblingDiscount: false,
  user: null,
  pendingAuthAction: null,
  pendingAuthContext: null
};

// Initialize Application on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  initAuthState();
  initLanguage();
  initCurrencySelector();
  renderCourses();
  renderTeachers();
  renderPricing();
  initFaqAccordion();
  initMobileMenu();
  initStickyHeader();
  initScrollAnimations();
  initAudioPlayerDemo();
  initModalsBackdropListener();
});

/* ==========================================================================
   1. Authentication & User Session Management
   ========================================================================== */
function initAuthState() {
  try {
    const raw = localStorage.getItem("quranora_auth_user");
    if (raw) {
      appState.user = JSON.parse(raw);
    }
  } catch (e) {
    console.error("Failed to parse auth user:", e);
    appState.user = null;
  }
  updateNavAuthUI();
}

function updateNavAuthUI() {
  const isUr = appState.currentLang === "ur";
  const portalText = document.getElementById("navPortalText");
  const mobilePortalText = document.getElementById("mobileNavPortalText");
  const mobilePortalBtnText = document.getElementById("mobileNavPortalBtnText");
  const btnNavPortal = document.getElementById("btnNavPortal");

  if (appState.user) {
    const displayName = appState.user.studentName || "Student";
    const label = isUr ? `پورٹل (${displayName})` : `Portal (${displayName})`;
    if (portalText) portalText.textContent = label;
    if (mobilePortalText) mobilePortalText.textContent = label;
    if (mobilePortalBtnText) mobilePortalBtnText.textContent = label;
    if (btnNavPortal) {
      btnNavPortal.classList.add("authenticated");
    }
  } else {
    const label = isUr ? "پورٹل / لاگ ان" : "Portal / Login";
    if (portalText) portalText.textContent = label;
    if (mobilePortalText) mobilePortalText.textContent = isUr ? "اسٹوڈنٹ پورٹل" : "Student Portal";
    if (mobilePortalBtnText) mobilePortalBtnText.textContent = label;
    if (btnNavPortal) {
      btnNavPortal.classList.remove("authenticated");
    }
  }
}

window.handleNavPortalClick = function() {
  if (appState.user) {
    openDashboardModal();
  } else {
    openAuthModal("portal");
  }
};

window.onAuthUserChanged = function(user) {
  appState.user = user;
  updateNavAuthUI();
};

function openAuthModal(intendedAction = null, contextData = null) {
  appState.pendingAuthAction = intendedAction;
  appState.pendingAuthContext = contextData;
  const modal = document.getElementById("authModal");
  if (modal) {
    modal.classList.add("active");
  }
}
window.openAuthModal = openAuthModal;

function closeAuthModal() {
  const modal = document.getElementById("authModal");
  if (modal) {
    modal.classList.remove("active");
  }
  appState.pendingAuthAction = null;
  appState.pendingAuthContext = null;
}
window.closeAuthModal = closeAuthModal;

function switchAuthTab(tab) {
  const tabSignIn = document.getElementById("tabBtnSignIn");
  const tabRegister = document.getElementById("tabBtnRegister");
  const signInForm = document.getElementById("signInForm");
  const quickRegisterForm = document.getElementById("quickRegisterForm");

  if (tab === "signin") {
    tabSignIn?.classList.add("active");
    tabRegister?.classList.remove("active");
    if (signInForm) signInForm.style.display = "block";
    if (quickRegisterForm) quickRegisterForm.style.display = "none";
  } else {
    tabRegister?.classList.add("active");
    tabSignIn?.classList.remove("active");
    if (signInForm) signInForm.style.display = "none";
    if (quickRegisterForm) quickRegisterForm.style.display = "block";
  }
}
window.switchAuthTab = switchAuthTab;

function handleSignInSubmit(e) {
  e.preventDefault();
  const input = document.getElementById("loginIdentifier")?.value.trim();
  if (!input) return;

  const newUser = {
    studentName: input.includes("@") ? input.split("@")[0] : input,
    age: "12",
    country: "United States",
    phone: input.startsWith("+") ? input : "+1 555-0199",
    course: "Nazra Quran with Tajweed",
    teacherPref: "Male or Female Instructor",
    days: "Mon, Wed, Fri",
    timeSlot: "06:00 PM EST",
    trialDay: 1, // Default trial day 1
    registeredAt: new Date().toLocaleDateString()
  };

  saveAndAuthenticateUser(newUser);
}
window.handleSignInSubmit = handleSignInSubmit;

function handleQuickRegisterSubmit(e) {
  e.preventDefault();
  const name = document.getElementById("regStudentName")?.value.trim();
  const phone = document.getElementById("regPhone")?.value.trim();
  const course = document.getElementById("regCourse")?.value;

  if (!name || !phone || !course) return;

  const newUser = {
    studentName: name,
    age: "10",
    country: "United Kingdom",
    phone: phone,
    course: course,
    teacherPref: "Certified Instructor",
    days: "Mon, Tue, Wed, Thu",
    timeSlot: "05:30 PM GMT",
    trialDay: 1,
    registeredAt: new Date().toLocaleDateString()
  };

  saveAndAuthenticateUser(newUser);
}
window.handleQuickRegisterSubmit = handleQuickRegisterSubmit;

function loginDemoUser(day = 1) {
  const isUnlocked = day >= 3;
  const demoUser = {
    studentName: isUnlocked ? "Zainab Ahmed" : "Ibrahim Khan",
    age: isUnlocked ? "14" : "9",
    country: isUnlocked ? "Canada" : "United States",
    phone: isUnlocked ? "+1 416 555 0182" : "+1 312 555 0144",
    email: isUnlocked ? "zainab.parent@example.com" : "ibrahim.k@example.com",
    course: isUnlocked ? "Hifz-ul-Quran (Memorization)" : "Noorani Qaida & Tajweed Basics",
    teacherPref: isUnlocked ? "Senior Qari / Alim" : "Female Instructor",
    days: "Mon, Wed, Thu, Fri",
    timeSlot: "05:00 PM EST",
    trialDay: day,
    trialCompleted: isUnlocked,
    registeredAt: new Date().toLocaleDateString()
  };

  saveAndAuthenticateUser(demoUser);
}
window.loginDemoUser = loginDemoUser;

function saveAndAuthenticateUser(user) {
  appState.user = user;
  localStorage.setItem("quranora_auth_user", JSON.stringify(user));
  updateNavAuthUI();
  
  const intended = appState.pendingAuthAction;
  const context = appState.pendingAuthContext;
  closeAuthModal();

  if (intended === "view_teacher" && context) {
    openTeacherProfileModal(context);
  } else {
    openDashboardModal();
  }
}

function logoutUser() {
  appState.user = null;
  localStorage.removeItem("quranora_auth_user");
  updateNavAuthUI();
  closeDashboardModal();
  closeTeacherProfileModal();
}
window.logoutUser = logoutUser;

/* ==========================================================================
   2. Teacher Profile Privacy Gate & Modal
   ========================================================================== */
window.handleTeacherProfileClick = function(teacherId) {
  if (appState.user) {
    openTeacherProfileModal(teacherId);
  } else {
    openAuthModal("view_teacher", teacherId);
  }
};

window.handleTeacherBookingClick = function(gender, name, teacherId) {
  if (appState.user) {
    selectTeacherForTrial(gender, name);
  } else {
    openAuthModal("book_teacher", teacherId);
  }
};

function openTeacherProfileModal(teacherId) {
  const teacher = teachersData.find(t => t.id === teacherId);
  if (!teacher) return;

  const modal = document.getElementById("teacherProfileModal");
  const content = document.getElementById("teacherProfileContent");
  if (!modal || !content) return;

  const isUr = appState.currentLang === "ur";
  const name = isUr ? teacher.nameUr : teacher.nameEn;
  const title = isUr ? teacher.titleUr : teacher.titleEn;
  const exp = isUr ? teacher.experienceUr : teacher.experienceEn;
  const qual = isUr ? teacher.qualificationUr : teacher.qualificationEn;
  const langs = isUr ? teacher.languagesUr : teacher.languagesEn;
  const bio = isUr ? teacher.bioUr : teacher.bioEn;
  const genderBadge = teacher.gender === "male"
    ? `<span class="teacher-gender male"><i class="fas fa-mars"></i> ${isUr ? "مرد استاد" : "Male Instructor"}</span>`
    : `<span class="teacher-gender female"><i class="fas fa-venus"></i> ${isUr ? "خاتون معلمہ (باحجاب)" : "Female Instructor (Hijab & Niqab)"}</span>`;

  content.innerHTML = `
    <div class="teacher-modal-profile-header">
      <div class="teacher-modal-image-box">
        <img src="${teacher.image}" alt="${name}" class="teacher-modal-avatar" />
        <span class="verified-sanad-badge" title="Verified Islamic Sanad"><i class="fas fa-certificate"></i> Verified Ijazah</span>
      </div>
      <div class="teacher-modal-meta">
        <div class="teacher-rating">
          <div class="stars">
            <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i>
          </div>
          <span><strong>${teacher.rating}</strong> (${teacher.reviewsCount} verified parent reviews)</span>
        </div>
        <h2>${name}</h2>
        <p class="teacher-modal-title">${title}</p>
        <div style="margin-top: 0.5rem;">${genderBadge}</div>
      </div>
    </div>

    <div class="teacher-modal-body">
      <div class="teacher-modal-grid">
        <div class="teacher-metric-card">
          <i class="fas fa-graduation-cap"></i>
          <div>
            <small>${isUr ? "تعلیمی قابلیت و اسناد" : "Qualification & Ijazah"}</small>
            <p><strong>${qual}</strong></p>
          </div>
        </div>
        <div class="teacher-metric-card">
          <i class="fas fa-clock-rotate-left"></i>
          <div>
            <small>${isUr ? "تدریسی تجربہ" : "Experience"}</small>
            <p><strong>${exp}</strong></p>
          </div>
        </div>
        <div class="teacher-metric-card">
          <i class="fas fa-language"></i>
          <div>
            <small>${isUr ? "تدریسی زبانیں" : "Languages"}</small>
            <p><strong>${langs}</strong></p>
          </div>
        </div>
        <div class="teacher-metric-card">
          <i class="fas fa-users"></i>
          <div>
            <small>${isUr ? "طلبہ کی تعداد" : "Students Mentored"}</small>
            <p><strong>${teacher.studentsTaught}</strong></p>
          </div>
        </div>
      </div>

      <div class="teacher-modal-bio-box">
        <h4><i class="fas fa-book-quran" style="color: var(--accent-gold);"></i> ${isUr ? "استاد کا تعارف و تدریسی اسلوب" : "Teaching Pedagogy & Background"}</h4>
        <p>${bio}</p>
      </div>

      <!-- Recitation Preview -->
      <div class="recitation-preview-bar" style="margin-top: 1.2rem; background: var(--primary-900);">
        <button class="btn-audio-play" onclick="playAudioDemo('${teacher.id}', '${teacher.audioVerse}')">
          <i class="fas fa-play" id="audio-icon-${teacher.id}"></i>
        </button>
        <div class="recitation-meta">
          <strong style="color: var(--accent-gold);">${teacher.audioSampleText}</strong>
          <small class="arabic-verse" style="color: #ffffff;">${teacher.audioVerse}</small>
        </div>
      </div>

      ${teacher.youtubeUrl ? `
        <div style="margin-top: 1rem;">
          <a href="${teacher.youtubeUrl}" target="_blank" rel="noopener" class="btn btn-sm btn-block" style="background: #ff0000; color: #ffffff; font-weight: 700;">
            <i class="fab fa-youtube"></i> ${isUr ? "یوٹیوب پر مکمل تلاوت سنیں" : "Listen on Official YouTube Channel"}
          </a>
        </div>
      ` : ''}

      <div class="teacher-modal-actions">
        <button class="btn btn-gold btn-block btn-lg" onclick="closeTeacherProfileModal(); selectTeacherForTrial('${teacher.gender}', '${name}')">
          <i class="fas fa-calendar-check"></i> ${isUr ? "اس استاد کے ساتھ 3 روزہ ٹرائل بک کریں" : "Book 3-Day Free Trial with this Teacher"}
        </button>
      </div>
    </div>
  `;

  modal.classList.add("active");
}
window.openTeacherProfileModal = openTeacherProfileModal;

function closeTeacherProfileModal() {
  const modal = document.getElementById("teacherProfileModal");
  if (modal) modal.classList.remove("active");
}
window.closeTeacherProfileModal = closeTeacherProfileModal;

/* ==========================================================================
   3. Language Switcher (English <-> Urdu) & RTL Handling
   ========================================================================== */
function initLanguage() {
  const langToggleBtn = document.getElementById("langToggleBtn");
  const langMobileBtn = document.getElementById("langMobileBtn");

  applyLanguage(appState.currentLang);

  if (langToggleBtn) {
    langToggleBtn.addEventListener("click", toggleLanguage);
  }
  if (langMobileBtn) {
    langMobileBtn.addEventListener("click", toggleLanguage);
  }
}

function toggleLanguage() {
  appState.currentLang = appState.currentLang === "en" ? "ur" : "en";
  localStorage.setItem("quranora_lang", appState.currentLang);
  applyLanguage(appState.currentLang);
  renderCourses();
  renderTeachers();
  renderPricing();
  if (document.getElementById("studentDashboardModal")?.classList.contains("active")) {
    renderDashboardContent();
  }
}

function applyLanguage(lang) {
  const isUrdu = lang === "ur";
  document.documentElement.lang = lang;
  document.documentElement.dir = isUrdu ? "rtl" : "ltr";
  
  if (isUrdu) {
    document.body.classList.add("urdu-mode");
  } else {
    document.body.classList.remove("urdu-mode");
  }

  // Update Toggle button label
  const langButtons = document.querySelectorAll(".lang-toggle-btn");
  langButtons.forEach(btn => {
    btn.innerHTML = isUrdu 
      ? `<span>English</span> <i class="fas fa-globe"></i>` 
      : `<span>اردو</span> <i class="fas fa-globe"></i>`;
  });

  // Replace text for all data-i18n attributes
  const elements = document.querySelectorAll("[data-i18n]");
  const dict = translations[lang] || translations.en;

  elements.forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) {
      el.innerHTML = dict[key];
    }
  });

  // Replace placeholders
  const placeholderElements = document.querySelectorAll("[data-i18n-ph]");
  placeholderElements.forEach(el => {
    const key = el.getAttribute("data-i18n-ph");
    if (dict[key]) {
      el.placeholder = dict[key];
    }
  });

  updateNavAuthUI();
}

/* ==========================================================================
   4. Course Cards Rendering & Filtering
   ========================================================================== */
function renderCourses() {
  const container = document.getElementById("coursesContainer");
  if (!container) return;

  const isUr = appState.currentLang === "ur";
  const filtered = coursesData.filter(c => {
    if (appState.currentCourseFilter === "all") return true;
    return c.category === appState.currentCourseFilter;
  });

  container.innerHTML = filtered.map(course => {
    const title = isUr ? course.titleUr : course.titleEn;
    const arabic = course.titleArabic;
    const desc = isUr ? course.descriptionUr : course.descriptionEn;
    const badge = isUr ? course.badgeUr : course.badgeEn;
    const duration = isUr ? course.durationUr : course.durationEn;
    const age = isUr ? course.targetAgeUr : course.targetAgeEn;
    const features = isUr ? course.featuresUr : course.featuresEn;
    const ctaText = isUr ? "3 روزہ مفت ٹرائل بک کریں" : "Start 3-Day Free Trial";

    return `
      <div class="course-card">
        <div class="course-card-header">
          <div class="course-icon"><i class="${course.icon}"></i></div>
          <div class="course-header-text">
            <span class="course-category-badge">${badge}</span>
            <h3 class="course-title">${title}</h3>
            <span class="course-arabic-title">${arabic}</span>
          </div>
        </div>
        <p class="course-desc">${desc}</p>
        <div class="course-meta-tags">
          <span><i class="fas fa-clock"></i> ${duration}</span>
          <span><i class="fas fa-user-group"></i> ${age}</span>
        </div>
        <ul class="course-features">
          ${features.map(f => `<li><i class="fas fa-check"></i> ${f}</li>`).join("")}
        </ul>
        <div class="course-card-footer">
          <button class="btn btn-gold btn-block" onclick="selectCourseForTrial('${title}')">
            <i class="fas fa-calendar-check"></i> ${ctaText}
          </button>
        </div>
      </div>
    `;
  }).join("");

  // Filter Buttons
  const filterBtns = document.querySelectorAll(".course-filter-btn:not(.teacher-filter-btn)");
  filterBtns.forEach(btn => {
    btn.onclick = () => {
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      appState.currentCourseFilter = btn.getAttribute("data-filter");
      renderCourses();
    };
  });
}

/* ==========================================================================
   5. Teachers Rendering with Privacy Gate
   ========================================================================== */
function renderTeachers() {
  const container = document.getElementById("teachersContainer");
  if (!container) return;

  const isUr = appState.currentLang === "ur";
  const filtered = teachersData.filter(t => {
    if (appState.currentTeacherFilter === "all") return true;
    return t.gender === appState.currentTeacherFilter;
  });

  container.innerHTML = filtered.map(t => {
    const name = isUr ? t.nameUr : t.nameEn;
    const title = isUr ? t.titleUr : t.titleEn;
    const exp = isUr ? t.experienceUr : t.experienceEn;
    const qual = isUr ? t.qualificationUr : t.qualificationEn;
    const langs = isUr ? t.languagesUr : t.languagesEn;
    const bio = isUr ? t.bioUr : t.bioEn;
    const genderBadge = t.gender === "male" 
      ? `<span class="teacher-gender male"><i class="fas fa-mars"></i> ${isUr ? "مرد استاد" : "Male Instructor"}</span>` 
      : `<span class="teacher-gender female"><i class="fas fa-venus"></i> ${isUr ? "خاتون معلمہ (باحجاب)" : "Female Instructor (Hijab & Niqab)"}</span>`;

    return `
      <div class="teacher-card">
        <div class="teacher-image-wrapper">
          <img src="${t.image}" alt="${name}" class="teacher-image" loading="lazy" />
          ${genderBadge}
        </div>
        <div class="teacher-info">
          <div class="teacher-rating">
            <div class="stars">
              <i class="fas fa-star"></i>
              <i class="fas fa-star"></i>
              <i class="fas fa-star"></i>
              <i class="fas fa-star"></i>
              <i class="fas fa-star"></i>
            </div>
            <span><strong>${t.rating}</strong> (${t.reviewsCount} reviews)</span>
          </div>

          <h3 class="teacher-name">${name}</h3>
          <p class="teacher-title">${title}</p>
          <p class="teacher-bio">${bio}</p>

          <div class="teacher-details-list">
            <div class="detail-item">
              <i class="fas fa-graduation-cap"></i>
              <div>
                <small>${isUr ? "تعلیمی قابلیت" : "Qualification"}</small>
                <p>${qual}</p>
              </div>
            </div>
            <div class="detail-item">
              <i class="fas fa-history"></i>
              <div>
                <small>${isUr ? "تدریسی تجربہ" : "Experience"}</small>
                <p>${exp}</p>
              </div>
            </div>
            <div class="detail-item">
              <i class="fas fa-language"></i>
              <div>
                <small>${isUr ? "زبانیں" : "Languages"}</small>
                <p>${langs}</p>
              </div>
            </div>
          </div>

          <!-- Recitation Audio Demo Pill -->
          <div class="recitation-preview-bar">
            <button class="btn-audio-play" onclick="playAudioDemo('${t.id}', '${t.audioVerse}')">
              <i class="fas fa-play" id="audio-icon-${t.id}"></i>
            </button>
            <div class="recitation-meta">
              <strong>${t.audioSampleText}</strong>
              <small class="arabic-verse">${t.audioVerse}</small>
            </div>
          </div>

          <!-- Teacher Profile & Booking Actions with Privacy Gate -->
          <div class="teacher-action-buttons">
            <button class="btn btn-outline-white btn-block btn-sm btn-view-profile" onclick="handleTeacherProfileClick('${t.id}')">
              <i class="fas fa-shield-halved"></i> ${isUr ? "مکمل پروفائل و اسناد دیکھیں (محفوظ)" : "View Verified Profile & Ijazah"}
            </button>
            <button class="btn btn-gold btn-block" onclick="selectTeacherForTrial('${t.gender}', '${name}')">
              <i class="fas fa-calendar-check"></i> ${isUr ? "3 روزہ ٹرائل منتخب کریں" : "Book 3-Day Trial with Teacher"}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  // Teacher filter buttons
  const teacherFilterBtns = document.querySelectorAll(".teacher-filter-btn");
  teacherFilterBtns.forEach(btn => {
    btn.onclick = () => {
      teacherFilterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      appState.currentTeacherFilter = btn.getAttribute("data-filter");
      renderTeachers();
    };
  });
}

/* ==========================================================================
   6. Audio Player Demo
   ========================================================================== */
let activeAudioTimeout = null;
function playAudioDemo(teacherId, text) {
  const icon = document.getElementById(`audio-icon-${teacherId}`);
  if (!icon) return;

  document.querySelectorAll(".btn-audio-play i").forEach(i => {
    i.className = "fas fa-play";
  });

  icon.className = "fas fa-spinner fa-spin";
  if (activeAudioTimeout) clearTimeout(activeAudioTimeout);

  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(432, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(528, ctx.currentTime + 0.8);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.2);
  } catch (e) {
    console.log("Audio not supported");
  }

  setTimeout(() => {
    icon.className = "fas fa-volume-up";
    activeAudioTimeout = setTimeout(() => {
      icon.className = "fas fa-play";
    }, 2500);
  }, 300);
}

function initAudioPlayerDemo() {
  window.playAudioDemo = playAudioDemo;
}

/* ==========================================================================
   7. Public Fees Section (Gated Structure Without Exposed Numbers)
   ========================================================================== */
function initCurrencySelector() {
  // Legacy currency init for any potential page select
}

function renderPricing() {
  const container = document.getElementById("pricingContainer");
  if (!container) return;

  const isUr = appState.currentLang === "ur";
  const plans = [pricingData.plans.basic, pricingData.plans.standard, pricingData.plans.premium];

  container.innerHTML = plans.map(plan => {
    const title = isUr ? plan.nameUr : plan.nameEn;
    const subtitle = isUr ? plan.nameUr : (plan.id === "standard" ? "Most Popular for Kids & Tajweed" : (plan.id === "basic" ? "Best for steady progress & beginners" : "For fast-track Hifz & daily mastery"));
    const days = isUr ? plan.daysPerWeekUr : plan.daysPerWeek;
    const duration = isUr ? plan.durationUr : plan.duration;
    const classesCount = isUr ? plan.classesPerMonthUr : plan.classesPerMonth;
    const features = isUr ? plan.featuresUr : plan.featuresEn;
    const btnText = isUr ? "3 روزہ ٹرائل شروع کریں (پلان ان لاک کرنے کے لیے)" : "Start 3-Day Trial to Unlock Plans";

    return `
      <div class="pricing-card ${plan.recommended ? 'featured' : ''}">
        ${plan.recommended ? `<div class="pricing-ribbon">${isUr ? 'سب سے زیادہ منتخب کردہ' : 'Most Recommended'}</div>` : ''}
        
        <div class="pricing-header">
          <h3 class="plan-name">${title}</h3>
          <p class="plan-subtitle">${subtitle}</p>
          <div class="plan-frequency-badge"><i class="fas fa-calendar-alt"></i> ${days}</div>
        </div>

        <div class="pricing-gated-box">
          <div class="gated-lock-tag"><i class="fas fa-shield-halved"></i> ${isUr ? '3 روزہ مفت ٹرائل میں شامل' : 'Included in 3-Day Free Trial'}</div>
          <div class="gated-evaluation-note">
            <strong>🔒 ${isUr ? 'ٹرائل کے تیسرے دن ڈیش بورڈ پر ان لاک ہوگا' : 'Tuition Rates Unlock on Day 3 of Trial'}</strong>
            <small>${isUr ? 'استاد کے جائزے کے بعد طالب علم کے مطابق فیس ظاہر ہوگی' : 'Evaluated after 2 live trial classes on Student Dashboard'}</small>
          </div>
          <div class="plan-sub-meta"><span>${duration}</span> • <span>${classesCount}</span></div>
        </div>

        <ul class="pricing-features-list">
          ${features.map(f => `<li><i class="fas fa-check-circle"></i> <span>${f}</span></li>`).join("")}
        </ul>

        <div class="pricing-action">
          <button class="btn ${plan.recommended ? 'btn-gold' : 'btn-primary'} btn-block" onclick="selectCourseForTrial('${title}')">
            <i class="fas fa-arrow-right"></i> ${btnText}
          </button>
        </div>
      </div>
    `;
  }).join("");
}

/* ==========================================================================
   8. Student / Parent Dashboard Modal & Trial Progress Logic
   ========================================================================== */
function openDashboardModal() {
  const modal = document.getElementById("studentDashboardModal");
  if (!modal) return;

  renderDashboardContent();
  modal.classList.add("active");
}
window.openDashboardModal = openDashboardModal;

function closeDashboardModal() {
  const modal = document.getElementById("studentDashboardModal");
  if (modal) modal.classList.remove("active");
}
window.closeDashboardModal = closeDashboardModal;

function setTrialDay(day) {
  if (!appState.user) return;
  appState.user.trialDay = Number(day);
  if (day >= 3) {
    appState.user.trialCompleted = true;
  }
  localStorage.setItem("quranora_auth_user", JSON.stringify(appState.user));
  renderDashboardContent();
}
window.setTrialDay = setTrialDay;

function renderDashboardContent() {
  if (!appState.user) return;

  const user = appState.user;
  const trialDay = Number(user.trialDay) || 1;
  const isUr = appState.currentLang === "ur";

  // Avatar & Basic info
  const nameParts = (user.studentName || "Student").split(" ");
  const initials = nameParts.map(p => p[0]).join("").substring(0, 2).toUpperCase();
  
  const avatarEl = document.getElementById("dashAvatar");
  const nameEl = document.getElementById("dashStudentName");
  const courseEl = document.getElementById("dashCourseTeacher");
  const trialStatusDesc = document.getElementById("dashTrialStatusDesc");

  if (avatarEl) avatarEl.textContent = initials || "QA";
  if (nameEl) nameEl.textContent = user.studentName || "Student";
  if (courseEl) {
    courseEl.textContent = `${isUr ? 'کورس:' : 'Course:'} ${user.course || 'Quran Reading with Tajweed'} • ${isUr ? 'استاد:' : 'Teacher:'} ${user.teacherPref || 'Dedicated Instructor'}`;
  }

  // Active pill state
  document.querySelectorAll(".btn-day-pill").forEach(p => p.classList.remove("active"));
  const activePill = document.getElementById(`btnDay${trialDay}`);
  if (activePill) activePill.classList.add("active");

  // Status description
  if (trialStatusDesc) {
    if (trialDay === 1) {
      trialStatusDesc.textContent = isUr
        ? "پہلا دن: استاد طالب علم کے مخارج اور بنیادی قرآنی فہم کا ابتدائی جائزہ لے رہے ہیں۔"
        : "Day 1 Active: Your instructor is conducting Makharij & basic Quran reading level assessment.";
    } else if (trialDay === 2) {
      trialStatusDesc.textContent = isUr
        ? "دوسرا دن: ون ٹو ون لائیو تدریس جاری ہے۔ 2 دن کی تکمیل پر کورس کے فیس پلانز ان لاک ہو جائیں گے۔"
        : "Day 2 Active: Live 1-on-1 personalized teaching in progress. 2 days of trial are required to unlock tuition plans.";
    } else {
      trialStatusDesc.textContent = isUr
        ? "تیسرا دن: جائزہ مکمل! آپ کے لیے مخصوص کورس فیس پلانز نیچے کامیابی سے ان لاک ہو گئے ہیں۔"
        : "Day 3 (2 Days Completed): Assessment complete! Your customized course tuition plans are now unlocked below.";
    }
  }

  // Steps Bar
  const stepsBar = document.getElementById("dashStepsBar");
  if (stepsBar) {
    stepsBar.innerHTML = `
      <div class="dash-step-item ${trialDay >= 1 ? 'completed' : ''}">
        <div class="step-circle">${trialDay > 1 ? '<i class="fas fa-check"></i>' : '1'}</div>
        <div class="step-info">
          <strong>${isUr ? 'پہلا دن: جائزہ' : 'Day 1: Level Test'}</strong>
          <small>${trialDay === 1 ? (isUr ? 'جاری ہے' : 'In Progress') : (isUr ? 'مکمل' : 'Completed')}</small>
        </div>
      </div>
      <div class="dash-step-line ${trialDay >= 2 ? 'completed' : ''}"></div>
      <div class="dash-step-item ${trialDay >= 2 ? 'completed' : ''}">
        <div class="step-circle">${trialDay > 2 ? '<i class="fas fa-check"></i>' : '2'}</div>
        <div class="step-info">
          <strong>${isUr ? 'دوسرا دن: لائیو کلاس' : 'Day 2: Live Class'}</strong>
          <small>${trialDay === 2 ? (isUr ? 'جاری ہے' : 'In Progress') : (trialDay > 2 ? (isUr ? 'مکمل' : 'Completed') : (isUr ? 'باقی ہے' : 'Pending'))}</small>
        </div>
      </div>
      <div class="dash-step-line ${trialDay >= 3 ? 'completed' : ''}"></div>
      <div class="dash-step-item ${trialDay >= 3 ? 'completed unlocked' : ''}">
        <div class="step-circle">${trialDay >= 3 ? '<i class="fas fa-unlock"></i>' : '3'}</div>
        <div class="step-info">
          <strong>${isUr ? 'تیسرا دن: فیس ان لاک' : 'Day 3: Plans Unlocked 🎉'}</strong>
          <small>${trialDay >= 3 ? (isUr ? 'ان لاک ہو گیا' : 'Unlocked') : (isUr ? 'مقفل (2 دن درکار)' : 'Locked (2 Days Req)')}</small>
        </div>
      </div>
    `;
  }

  // Pricing Section on Dashboard
  renderDashboardPricing();
}

function renderDashboardPricing() {
  const container = document.getElementById("dashPricingSection");
  if (!container || !appState.user) return;

  const trialDay = Number(appState.user.trialDay) || 1;
  const isUr = appState.currentLang === "ur";
  const isUnlocked = trialDay >= 3;

  if (!isUnlocked) {
    // Locked view (Days 1 & 2)
    container.innerHTML = `
      <div class="dash-pricing-locked-card">
        <div class="locked-icon-halo">
          <i class="fas fa-lock"></i>
        </div>
        <h3>${isUr ? '🔒 کورس فیس کے پلانز فی الحال مقفل ہیں' : '🔒 Course Fee Plans Locked'}</h3>
        <p>
          ${isUr 
            ? `آپ فی الحال اپنے 3 روزہ مفت ٹرائل کے <strong>دن ${trialDay}/3</strong> پر ہیں۔ شفاف اور مناسب ماہانہ فیس کا تعین طالب علم کی رفتار اور کلاسز کی تعداد کے جائزے کے بعد کیا جاتا ہے۔ 2 ٹرائل کلاسز مکمل ہونے پر یہ سیکشن خود بخود کھل جائے گا۔`
            : `You are currently on <strong>Day ${trialDay} of your 3-Day Free Trial</strong>. To ensure fair and tailored learning, our faculty personalizes tuition plans after evaluating your child during 2 live trial classes. Full pricing options with all currencies will unlock here on Day 3!`}
        </p>
        
        <div class="trial-unlock-meter-box">
          <div class="meter-bar-track">
            <div class="meter-bar-fill" style="width: ${trialDay === 2 ? '50%' : '25%'};"></div>
          </div>
          <div class="meter-meta">
            <span><i class="fas fa-hourglass-half"></i> ${trialDay === 1 ? '1 / 2 Evaluation Days Completed (50% remaining)' : '2 / 2 Evaluation Days In Progress (Almost Ready!)'}</span>
          </div>
        </div>

        <div style="margin-top: 1.5rem; display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
          <button type="button" class="btn btn-gold btn-sm" onclick="setTrialDay(3)">
            <i class="fas fa-bolt"></i> ${isUr ? '2 دن کی تکمیل سمولیٹ کریں (فیس دیکھنے کے لیے)' : 'Simulate 2 Days Completed (Instant Unlock)'}
          </button>
          <a href="https://wa.me/923165691212?text=Assalam-o-Alaikum!%20I%20am%20attending%20my%203-day%20trial%20class%20on%20Quranora." target="_blank" rel="noopener" class="btn btn-whatsapp btn-sm">
            <i class="fab fa-whatsapp"></i> Chat with Trial Coordinator
          </a>
        </div>
      </div>
    `;
  } else {
    // Unlocked view (Day 3 / After 2 days)
    const currCode = appState.currentCurrency;
    const currInfo = pricingData.currencies[currCode] || pricingData.currencies.USD;
    const plans = [pricingData.plans.basic, pricingData.plans.standard, pricingData.plans.premium];

    container.innerHTML = `
      <div class="dash-pricing-unlocked-card">
        <div class="unlocked-header-banner">
          <div class="unlocked-icon"><i class="fas fa-circle-check"></i></div>
          <div>
            <h3>${isUr ? '🎉 مبارک ہو! 2 روزہ جائزہ مکمل — فیس پلانز ان لاک ہو گئے ہیں' : '🎉 Evaluation Complete! Personalized Tuition Plans Unlocked'}</h3>
            <p>${isUr ? 'آپ کے استاد نے تلاوت کا معیار اور رفتار نوٹ کر لی ہے۔ نیچے دیے گئے پیکجز میں سے اپنی پسند کا شیڈول اور کرنسی منتخب کریں۔' : 'Your teacher has completed the 2-day live evaluation. Choose your preferred monthly learning schedule and currency below to enroll permanently.'}</p>
          </div>
        </div>

        <!-- Dashboard Multi-Currency & Discount Controls -->
        <div class="dash-pricing-controls">
          <div class="currency-picker-box">
            <label for="dashCurrencySelector"><i class="fas fa-money-bill-wave"></i> ${isUr ? 'کرنسی منتخب کریں:' : 'Select Currency:'}</label>
            <select id="dashCurrencySelector" class="currency-select" onchange="handleDashCurrencyChange(this.value)">
              ${Object.keys(pricingData.currencies).map(c => {
                const info = pricingData.currencies[c];
                return `<option value="${c}" ${c === currCode ? 'selected' : ''}>${info.flag} ${info.label}</option>`;
              }).join("")}
            </select>
          </div>

          <label class="sibling-discount-badge-toggle">
            <input type="checkbox" id="dashSiblingDiscountToggle" ${appState.hasSiblingDiscount ? 'checked' : ''} onchange="handleDashDiscountChange(this.checked)" />
            <span>${isUr ? '🎉 10% فیملی ڈسکاؤنٹ لاگو کریں (2+ طلبہ)' : '🎉 Apply 10% Sibling & Family Discount'}</span>
          </label>
        </div>

        <!-- Unlocked Plans Grid -->
        <div class="pricing-grid dash-unlocked-grid">
          ${plans.map(plan => {
            let baseRate = plan.rates[currCode] || plan.rates.USD;
            let originalRate = baseRate;
            let hasDiscount = appState.hasSiblingDiscount;

            if (hasDiscount) {
              baseRate = Math.round(baseRate * 0.9);
            }

            const title = isUr ? plan.nameUr : plan.nameEn;
            const subtitle = isUr ? plan.nameUr : (plan.id === "standard" ? "Most Popular for Kids & Tajweed" : (plan.id === "basic" ? "Best for steady progress & beginners" : "For fast-track Hifz & daily mastery"));
            const days = isUr ? plan.daysPerWeekUr : plan.daysPerWeek;
            const duration = isUr ? plan.durationUr : plan.duration;
            const classesCount = isUr ? plan.classesPerMonthUr : plan.classesPerMonth;
            const features = isUr ? plan.featuresUr : plan.featuresEn;

            return `
              <div class="pricing-card ${plan.recommended ? 'featured' : ''}">
                ${plan.recommended ? `<div class="pricing-ribbon">${isUr ? 'سب سے زیادہ منتخب کردہ' : 'Most Recommended'}</div>` : ''}
                
                <div class="pricing-header">
                  <h3 class="plan-name">${title}</h3>
                  <p class="plan-subtitle">${subtitle}</p>
                  <div class="plan-frequency-badge"><i class="fas fa-calendar-alt"></i> ${days}</div>
                </div>

                <div class="pricing-price-box">
                  <div class="price-amount-wrapper">
                    <span class="currency-symbol">${currInfo.symbol}</span>
                    <span class="price-number">${baseRate}</span>
                    <span class="price-period">${isUr ? '/ ماہانہ' : '/ month'}</span>
                  </div>
                  ${hasDiscount ? `<div class="discount-applied"><del>${currInfo.symbol}${originalRate}</del> <span>10% Sibling OFF</span></div>` : ''}
                  <div class="plan-sub-meta"><span>${duration}</span> • <span>${classesCount}</span></div>
                </div>

                <ul class="pricing-features-list">
                  ${features.map(f => `<li><i class="fas fa-check-circle"></i> <span>${f}</span></li>`).join("")}
                </ul>

                <div class="pricing-action">
                  <a href="https://wa.me/923165691212?text=${encodeURIComponent(`Assalam-o-Alaikum! I have completed my 2-day trial and want to enroll in the ${title} (${currInfo.symbol}${baseRate}/month) for student ${appState.user.studentName}.`)}" target="_blank" rel="noopener" class="btn ${plan.recommended ? 'btn-gold' : 'btn-whatsapp'} btn-block">
                    <i class="fab fa-whatsapp"></i> ${isUr ? 'اس پلان میں داخلہ لیں' : 'Confirm Enrollment in this Plan'}
                  </a>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }
}

window.handleDashCurrencyChange = function(newCurr) {
  appState.currentCurrency = newCurr;
  localStorage.setItem("quranora_currency", newCurr);
  renderDashboardPricing();
};

window.handleDashDiscountChange = function(checked) {
  appState.hasSiblingDiscount = checked;
  renderDashboardPricing();
};

/* ==========================================================================
   9. FAQs Accordion
   ========================================================================== */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll(".faq-item");
  faqItems.forEach(item => {
    const header = item.querySelector(".faq-question");
    if (header) {
      header.addEventListener("click", () => {
        const isOpen = item.classList.contains("active");
        faqItems.forEach(other => other.classList.remove("active"));
        if (!isOpen) {
          item.classList.add("active");
        }
      });
    }
  });
}

/* ==========================================================================
   10. Sticky Header & Mobile Nav Drawer
   ========================================================================== */
function initStickyHeader() {
  const header = document.getElementById("mainHeader");
  const backToTop = document.getElementById("backToTop");

  window.addEventListener("scroll", () => {
    if (header) {
      if (window.scrollY > 50) {
        header.classList.add("scrolled");
      } else {
        header.classList.remove("scrolled");
      }
    }

    if (backToTop) {
      if (window.scrollY > 400) {
        backToTop.classList.add("visible");
      } else {
        backToTop.classList.remove("visible");
      }
    }
  });

  if (backToTop) {
    backToTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
}

function initMobileMenu() {
  const menuBtn = document.getElementById("mobileMenuBtn");
  const mobileNav = document.getElementById("mobileNavDrawer");
  const overlay = document.getElementById("mobileOverlay");
  const closeBtn = document.getElementById("mobileCloseBtn");
  const navLinks = document.querySelectorAll(".mobile-nav-link");

  function openMenu() {
    mobileNav?.classList.add("active");
    overlay?.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeMenu() {
    mobileNav?.classList.remove("active");
    overlay?.classList.remove("active");
    document.body.style.overflow = "";
  }

  if (menuBtn) menuBtn.addEventListener("click", openMenu);
  if (closeBtn) closeBtn.addEventListener("click", closeMenu);
  if (overlay) overlay.addEventListener("click", closeMenu);

  navLinks.forEach(link => {
    link.addEventListener("click", closeMenu);
  });
}

/* ==========================================================================
   11. Intersection Observer for Smooth Scroll Reveal
   ========================================================================== */
function initScrollAnimations() {
  const animElements = document.querySelectorAll(".reveal-on-scroll");
  if (!("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("revealed");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  animElements.forEach(el => observer.observe(el));
}

/* ==========================================================================
   12. Global Modals Backdrop Dismiss Listener
   ========================================================================== */
function initModalsBackdropListener() {
  const modals = ["authModal", "teacherProfileModal", "studentDashboardModal", "successModal"];
  modals.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("click", (e) => {
        if (e.target === el) {
          el.classList.remove("active");
        }
      });
    }
  });
}
