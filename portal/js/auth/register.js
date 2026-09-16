/**
 * Quranora Portal - Registration Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registerForm');
  const submitBtn = document.getElementById('regSubmitBtn');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('regName').value.trim();
      const age = document.getElementById('regAge').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const password = document.getElementById('regPassword').value;
      const phone = document.getElementById('regPhone').value.trim();
      const country = document.getElementById('regCountry').value.trim();
      const course_id = document.getElementById('regCourse').value;
      const timezone = document.getElementById('regTimezone').value;
      const notes = document.getElementById('regNotes').value.trim();

      if (!name || !email || !password || !country || !course_id) {
        UI.showToast('Please fill in all required fields.', 'warning');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting Application...';

      try {
        const res = await ApiClient.post('/api/auth/register', {
          name,
          age,
          email,
          password,
          phone,
          country,
          course_id,
          timezone,
          notes
        });

        if (res.success) {
          form.reset();
          UI.openModal('regSuccessModal');
        } else {
          UI.showToast(res.message || 'Registration failed.', 'error');
        }
      } catch (err) {
        console.error('Registration submission error:', err);
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Registration Application';
      }
    });
  }
});
