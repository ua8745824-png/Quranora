/**
 * Quranora Portal - Login Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const emailInput = document.getElementById('emailInput');
  const passwordInput = document.getElementById('passwordInput');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const submitBtn = document.getElementById('submitBtn');

  // Password toggle
  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', () => {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      togglePasswordBtn.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i> Show' : '<i class="fas fa-eye-slash"></i> Hide';
    });
  }

  // Handle Login submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = emailInput.value.trim();
      const password = passwordInput.value;

      if (!email || !password) {
        UI.showToast('Please enter both email and password.', 'warning');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';

      try {
        const res = await ApiClient.post('/api/auth/login', { email, password });
        if (res.success) {
          ApiClient.setToken(res.token);
          ApiClient.setUser(res.user);

          UI.showToast('Login successful! Redirecting...', 'success');
          setTimeout(() => {
            window.location.href = res.redirectUrl || '/admin';
          }, 400);
        } else {
          UI.showToast(res.message || 'Login failed.', 'error');
        }
      } catch (err) {
        console.error('Login error:', err);
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In to Dashboard';
      }
    });
  }
});

// Quick 1-click Demo Role Switcher
window.quickLogin = async function(demoKey) {
  try {
    const res = await ApiClient.post('/api/auth/demo-switch', { demoKey });
    if (res.success) {
      ApiClient.setToken(res.token);
      ApiClient.setUser(res.user);
      UI.showToast(`Logged in as ${res.user.role.toUpperCase()}!`, 'success');
      setTimeout(() => {
        window.location.href = res.redirectUrl || '/admin';
      }, 400);
    }
  } catch (err) {
    console.error('Demo switch error:', err);
  }
};
