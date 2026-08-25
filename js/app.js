/**
 * Quranora Online Quran Academy - Main Application Controller
 */

// Application State
const appState = {
  currentLang: localStorage.getItem("quranora_lang") || "en",
  currentCurrency: localStorage.getItem("quranora_currency") || "USD",
  currentCourseFilter: "all",
  currentTeacherFilter: "all",
  hasSiblingDiscount: false
};

// Initialize Application on DOM ready
document.addEventListener("DOMContentLoaded", () => {
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
});

/* ==========================================================================
   1. Language Switcher (English <-> Urdu) & RTL Handling
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
}

/* ==========================================================================
   2. Course Cards Rendering & Filtering
   ========================================================================== */
function renderCourses() {
  const container = document.getElementById("coursesContainer");
  if (!container) return;

  const isUr = appState.currentLang === "ur";
  const filtered = coursesData.filter(course => {
    if (appState.currentCourseFilter === "all") return true;
    if (appState.currentCourseFilter === "kids") return course.category.includes("kids");
    if (appState.currentCourseFilter === "quran") return course.category.includes("quran");
    if (appState.currentCourseFilter === "advanced") return course.category.includes("advanced");
    return true;
  });

  container.innerHTML = filtered.map(course => {
    const title = isUr ? course.titleUr : course.titleEn;
    const tagline = isUr ? course.taglineUr : course.taglineEn;
    const features = isUr ? course.featuresUr : course.featuresEn;
    const btnText = isUr ? "Book Free Trial" : "Book Free Trial";

    return `
      <div class="course-card" data-category="${course.category}">
        <div class="course-card-header">
          <span class="course-badge">${course.badge}</span>
          <div class="course-icon">${course.icon}</div>
        </div>
        <h3 class="course-title">${title}</h3>
        <p class="course-tagline">${tagline}</p>
        
        <div class="course-meta">
          <span><i class="fas fa-user-graduate"></i> ${course.ageGroup}</span>
          <span><i class="fas fa-clock"></i> ${course.duration}</span>
        </div>

        <ul class="course-features">
          ${features.map(f => `<li><i class="fas fa-check-circle"></i> <span>${f}</span></li>`).join("")}
        </ul>

        <div class="course-card-actions">
          <button class="btn btn-primary btn-block" onclick="selectCourseForTrial('${title}')">
            <i class="fas fa-calendar-check"></i> ${btnText}
          </button>
        </div>
      </div>
    `;
  }).join("");

  // Attach filter tab listeners
  const filterBtns = document.querySelectorAll(".course-filter-btn");
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
   3. Teachers Rendering & Male/Female Filtering
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
      ? `<span class="teacher-gender male"><i class="fas fa-mars"></i> Male Instructor</span>` 
      : `<span class="teacher-gender female"><i class="fas fa-venus"></i> Female Instructor</span>`;

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

          ${t.youtubeUrl ? `
            <a href="${t.youtubeUrl}" target="_blank" rel="noopener" class="btn btn-sm btn-outline-white" style="background-color: #ff0000; color: #ffffff; border-color: #ff0000; margin-bottom: 0.6rem; width: 100%;">
              <i class="fab fa-youtube"></i> ${isUr ? "یوٹیوب پر مکمل تلاوت سنیں" : "Listen on Official YouTube Channel"}
            </a>
          ` : ''}

          <button class="btn btn-outline btn-block" onclick="selectTeacherForTrial('${t.gender}', '${name}')">
            <i class="fas fa-user-check"></i> ${isUr ? "Book Trial with Teacher" : "Book Trial with Teacher"}
          </button>
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
   4. Audio Player Demo (Web Audio synthesized recitation preview)
   ========================================================================== */
let activeAudioTimeout = null;
function playAudioDemo(teacherId, text) {
  const icon = document.getElementById(`audio-icon-${teacherId}`);
  if (!icon) return;

  // Reset any other playing icons
  document.querySelectorAll(".btn-audio-play i").forEach(i => {
    i.className = "fas fa-play";
  });

  icon.className = "fas fa-spinner fa-spin";

  if (activeAudioTimeout) clearTimeout(activeAudioTimeout);

  // Play pleasant acoustic chime feedback
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
   5. Pricing & Currency Switcher
   ========================================================================== */
function initCurrencySelector() {
  const select = document.getElementById("currencySelector");
  if (!select) return;

  // Populate options
  select.innerHTML = Object.keys(pricingData.currencies).map(code => {
    const curr = pricingData.currencies[code];
    return `<option value="${code}" ${code === appState.currentCurrency ? "selected" : ""}>${curr.flag} ${curr.label}</option>`;
  }).join("");

  select.addEventListener("change", (e) => {
    appState.currentCurrency = e.target.value;
    localStorage.setItem("quranora_currency", appState.currentCurrency);
    renderPricing();
  });

  // Sibling discount checkbox
  const siblingCheck = document.getElementById("siblingDiscountToggle");
  if (siblingCheck) {
    siblingCheck.addEventListener("change", (e) => {
      appState.hasSiblingDiscount = e.target.checked;
      renderPricing();
    });
  }
}

function renderPricing() {
  const container = document.getElementById("pricingContainer");
  if (!container) return;

  const isUr = appState.currentLang === "ur";
  const currCode = appState.currentCurrency;
  const currInfo = pricingData.currencies[currCode] || pricingData.currencies.USD;
  const plans = [pricingData.plans.basic, pricingData.plans.standard, pricingData.plans.premium];

  container.innerHTML = plans.map(plan => {
    let baseRate = plan.rates[currCode] || plan.rates.USD;
    let originalRate = baseRate;
    let hasDiscount = appState.hasSiblingDiscount;

    if (hasDiscount) {
      baseRate = Math.round(baseRate * 0.9); // 10% discount
    }

    const title = isUr ? plan.nameUr : plan.nameEn;
    const subtitle = isUr ? plan.nameUr : (plan.id === "standard" ? "Most Popular for Kids & Tajweed" : (plan.id === "basic" ? "Best for steady progress & beginners" : "For fast-track Hifz & daily mastery"));
    const days = isUr ? plan.daysPerWeekUr : plan.daysPerWeek;
    const duration = isUr ? plan.durationUr : plan.duration;
    const classesCount = isUr ? plan.classesPerMonthUr : plan.classesPerMonth;
    const features = isUr ? plan.featuresUr : plan.featuresEn;
    const btnText = isUr ? "Book Free Trial" : "Book Free Trial";

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
          <button class="btn ${plan.recommended ? 'btn-gold' : 'btn-primary'} btn-block" onclick="selectCourseForTrial('${title}')">
            <i class="fas fa-arrow-right"></i> ${btnText}
          </button>
        </div>
      </div>
    `;
  }).join("");
}

/* ==========================================================================
   6. FAQs Accordion
   ========================================================================== */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll(".faq-item");
  faqItems.forEach(item => {
    const header = item.querySelector(".faq-question");
    header.addEventListener("click", () => {
      const isOpen = item.classList.contains("active");
      faqItems.forEach(other => other.classList.remove("active"));
      if (!isOpen) {
        item.classList.add("active");
      }
    });
  });
}

/* ==========================================================================
   7. Sticky Header & Mobile Nav Drawer
   ========================================================================== */
function initStickyHeader() {
  const header = document.getElementById("mainHeader");
  const backToTop = document.getElementById("backToTop");

  window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
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
    mobileNav.classList.add("active");
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeMenu() {
    mobileNav.classList.remove("active");
    overlay.classList.remove("active");
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
   8. Intersection Observer for Smooth Scroll Reveal
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
