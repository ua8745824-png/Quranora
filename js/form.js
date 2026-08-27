/**
 * Quranora - Admission & Free Trial Form Handling
 */

// Academy WhatsApp Support Number (Configurable)
const ACADEMY_WHATSAPP_NUMBER = "923165691212"; // +92 316 5691212

document.addEventListener("DOMContentLoaded", () => {
  const trialForm = document.getElementById("trialAdmissionForm");
  const modal = document.getElementById("successModal");
  const modalCloseBtn = document.getElementById("modalCloseBtn");
  const modalWhatsappLink = document.getElementById("modalWhatsappLink");
  const modalSummary = document.getElementById("modalSummary");

  if (trialForm) {
    trialForm.addEventListener("submit", (e) => {
      e.preventDefault();

      // Collect form data
      const studentName = document.getElementById("studentName")?.value.trim();
      const age = document.getElementById("studentAge")?.value.trim();
      const country = document.getElementById("studentCountry")?.value.trim();
      const phone = document.getElementById("studentPhone")?.value.trim();
      const email = document.getElementById("studentEmail")?.value.trim() || "Not provided";
      const course = document.getElementById("studentCourse")?.value;
      const teacherPref = document.getElementById("teacherPref")?.value;
      const days = document.getElementById("preferredDays")?.value;
      const timeSlot = document.getElementById("preferredTime")?.value.trim();
      const message = document.getElementById("studentMessage")?.value.trim() || "None";

      if (!studentName || !age || !country || !phone || !course || !teacherPref || !days || !timeSlot) {
        alert("Please fill in all required fields marked with *");
        return;
      }

      // Generate structured WhatsApp message
      const whatsappText = `🌟 *New Free Trial Registration - Quranora Academy* 🌟
----------------------------------
👤 *Student Name:* ${studentName}
🎂 *Age:* ${age}
🌍 *Country / City:* ${country}
📱 *WhatsApp Phone:* ${phone}
📧 *Email:* ${email}
📖 *Selected Course:* ${course}
👨‍🏫 *Teacher Preference:* ${teacherPref}
🗓️ *Preferred Days:* ${days}
⏰ *Preferred Time:* ${timeSlot}
📝 *Special Notes:* ${message}
----------------------------------
_Registered via Quranora.com official portal_`;

      const encodedMsg = encodeURIComponent(whatsappText);
      const whatsappUrl = `https://wa.me/${ACADEMY_WHATSAPP_NUMBER}?text=${encodedMsg}`;

      // Save/Register user to localStorage
      const authUser = {
        studentName: studentName,
        age: age,
        country: country,
        phone: phone,
        email: email,
        course: course,
        teacherPref: teacherPref,
        days: days,
        timeSlot: timeSlot,
        trialDay: 1, // Start on Day 1
        registeredAt: new Date().toLocaleDateString()
      };
      localStorage.setItem("quranora_auth_user", JSON.stringify(authUser));

      if (window.onAuthUserChanged) {
        window.onAuthUserChanged(authUser);
      }

      // Update Modal content
      if (modalSummary) {
        modalSummary.innerHTML = `
          <div class="modal-summary-card">
            <p><strong>Student:</strong> ${studentName} (${age})</p>
            <p><strong>Course:</strong> ${course}</p>
            <p><strong>Country:</strong> ${country}</p>
            <p><strong>Teacher Preference:</strong> ${teacherPref}</p>
            <p><strong>Preferred Timing:</strong> ${days} @ ${timeSlot}</p>
            <div style="margin-top: 0.75rem; padding: 0.6rem; background: rgba(207,168,74,0.15); border-radius: 8px; font-size: 0.85rem; color: var(--primary-900);">
              🌟 <strong>Account Created:</strong> Your 3-Day Free Trial is active. You can now access your Student Dashboard!
            </div>
          </div>
        `;
      }

      if (modalWhatsappLink) {
        modalWhatsappLink.href = whatsappUrl;
        modalWhatsappLink.setAttribute("target", "_blank");
      }

      // Show success modal
      if (modal) {
        modal.classList.add("active");
      }

      // Reset form
      trialForm.reset();
    });
  }

  // Close modal listeners
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", () => {
      modal.classList.remove("active");
    });
  }

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.remove("active");
      }
    });
  }
});

// Helper to pre-select course or teacher from cards
window.selectCourseForTrial = function(courseTitle) {
  const courseSelect = document.getElementById("studentCourse");
  if (courseSelect) {
    for (let i = 0; i < courseSelect.options.length; i++) {
      if (courseSelect.options[i].text.toLowerCase().includes(courseTitle.toLowerCase()) || courseSelect.options[i].value.toLowerCase().includes(courseTitle.toLowerCase())) {
        courseSelect.selectedIndex = i;
        break;
      }
    }
  }
  const formSection = document.getElementById("free-trial");
  if (formSection) {
    formSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

window.selectTeacherForTrial = function(teacherGender, teacherName) {
  const teacherSelect = document.getElementById("teacherPref");
  const notesField = document.getElementById("studentMessage");
  if (teacherSelect) {
    if (teacherGender === "male") {
      teacherSelect.value = "Male Teacher (for boys / brothers)";
    } else if (teacherGender === "female") {
      teacherSelect.value = "Female Teacher (for girls / sisters)";
    }
  }
  if (notesField && teacherName) {
    notesField.value = `Preferred Instructor: ${teacherName}`;
  }
  const formSection = document.getElementById("free-trial");
  if (formSection) {
    formSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};
