/**
 * Quranora Portal - Unified API Client
 */

const ApiClient = {
  getToken() {
    return localStorage.getItem('quranora_token') || '';
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('quranora_token', token);
    } else {
      localStorage.removeItem('quranora_token');
    }
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem('quranora_user') || 'null');
    } catch (e) {
      return null;
    }
  },

  setUser(user) {
    if (user) {
      localStorage.setItem('quranora_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('quranora_user');
    }
  },

  logout() {
    localStorage.removeItem('quranora_token');
    localStorage.removeItem('quranora_user');
    window.location.href = '/login';
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(endpoint, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        // Session expired or invalid
        console.warn('Unauthorized request. Redirecting to login.');
        this.logout();
        return { success: false, message: 'Session expired. Please log in again.' };
      }

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: Request failed.`);
      }

      return data;
    } catch (err) {
      console.error(`API Error on [${endpoint}]:`, err.message);
      if (window.UI && window.UI.showToast) {
        window.UI.showToast(err.message, 'error');
      }
      throw err;
    }
  },

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
};

window.ApiClient = ApiClient;
