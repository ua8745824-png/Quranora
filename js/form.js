/**
 * Quranora - Admission & Free Trial Form Handling
 */

// Academy Official Contacts
const ACADEMY_WHATSAPP_NUMBER = "923295056701"; // +92 329 5056701
const ACADEMY_EMAIL = "syedumarali37406@gmail.com";

document.addEventListener("DOMContentLoaded", () => {
  const trialForm = document.getElementById("trialAdmissionForm");
  const modal = document.getElementById("successModal");
  const modalCloseBtn = document.getElementById("modalCloseBtn");
  const modalWhatsappLink = document.getElementById("modalWhatsappLink");
  const modalEmailLink = document.getElementById("modalEmailLink");
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

      // 1. Structured WhatsApp message
      const whatsappText = `🌟 *New Free Demo Class Registration - Quranora Academy* 🌟
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

      // 2. Structured Email (for European / International non-WhatsApp users)
      const emailSubject = `New Demo Class Booking - ${studentName} (${course})`;
      const emailBody = `Assalam-o-Alaikum Quranora Academy,

A new student has registered for a Free Demo Class:

Student Name: ${studentName}
Age: ${age}
Country / Location: ${country}
Phone / WhatsApp: ${phone}
Student Email: ${email}
Course: ${course}
Teacher Preference: ${teacherPref}
Preferred Schedule: ${days} @ ${timeSlot}
Special Notes: ${message}

Submitted via Quranora.com`;

      const mailtoUrl = `mailto:${ACADEMY_EMAIL}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

      // Update Modal content
      if (modalSummary) {
        modalSummary.innerHTML = `
          <div class="modal-summary-card">
            <p><strong>Student:</strong> ${studentName} (${age})</p>
            <p><strong>Course:</strong> ${course}</p>
            <p><strong>Location:</strong> ${country}</p>
            <p><strong>Phone:</strong> ${phone}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Teacher Preference:</strong> ${teacherPref}</p>
            <p><strong>Preferred Timing:</strong> ${days} @ ${timeSlot}</p>
          </div>
        `;
      }

      if (modalWhatsappLink) {
        modalWhatsappLink.href = whatsappUrl;
        modalWhatsappLink.setAttribute("target", "_blank");
      }

      if (modalEmailLink) {
        modalEmailLink.href = mailtoUrl;
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
