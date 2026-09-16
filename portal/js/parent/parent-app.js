/**
 * Quranora Portal - Parent SPA Controller
 */

let parentData = null;
let activeChildId = null;
let activeParentChatContactId = null;

document.addEventListener('DOMContentLoaded', async () => {
  const user = ApiClient.getUser();
  if (!user || user.role !== 'parent') {
    window.location.href = '/login';
    return;
  }

  setupParentNavigation();
  await loadParentOverview();
  loadParentNotifications();
});

function setupParentNavigation() {
  const navItems = document.querySelectorAll('#sidebarNav .nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const module = item.getAttribute('data-module');
      if (module) switchParentModule(module);
    });
  });

  const toggleBtn = document.getElementById('mobileSidebarToggle');
  const sidebar = document.getElementById('portalSidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
  }
}

function switchParentModule(moduleName) {
  document.querySelectorAll('#sidebarNav .nav-item').forEach(el => {
    if (el.getAttribute('data-module') === moduleName) el.classList.add('active');
    else el.classList.remove('active');
  });

  document.querySelectorAll('.module-view').forEach(view => view.classList.remove('active'));
  const targetView = document.getElementById(`module-${moduleName}`);
  if (targetView) targetView.classList.add('active');

  const titles = {
    dashboard: 'Family Overview',
    timetable: 'Family Timetable',
    progress: 'Children Quran Progress',
    attendance: 'Attendance Record',
    homework: 'Homework Review',
    fees: 'Family Invoices & Tuition',
    messages: 'Chat with Teachers'
  };
  const titleEl = document.getElementById('pageTitle');
  if (titleEl) titleEl.textContent = titles[moduleName] || 'Parent Portal';

  const sidebar = document.getElementById('portalSidebar');
  if (sidebar) sidebar.classList.remove('open');

  switch (moduleName) {
    case 'dashboard':
      loadParentOverview();
      break;
    case 'timetable':
      renderFamilyTimetable();
      break;
    case 'progress':
      loadParentProgress();
      break;
    case 'attendance':
      loadParentAttendance();
      break;
    case 'homework':
      loadParentHomework();
      break;
    case 'fees':
      loadParentFees();
      break;
    case 'messages':
      loadParentMessages();
      break;
  }
}

/* ==========================================================================
   1. Parent Overview Loader
   ========================================================================== */
async function loadParentOverview() {
  try {
    const res = await ApiClient.get('/api/parent/overview');
    if (!res.success) return;

    parentData = res;
    document.getElementById('parentNameDisplay').textContent = res.parent.name;

    // Children Selector Tabs
    const tabsContainer = document.getElementById('childrenSelectorTabs');
    if (tabsContainer && res.children.length > 0) {
      if (!activeChildId) activeChildId = res.children[0].id;

      tabsContainer.innerHTML = res.children.map(c => `
        <button class="btn ${c.id === activeChildId ? 'btn-gold' : 'btn-outline'} btn-sm" onclick="selectChild(${c.id})">
          <i class="fas fa-user"></i> ${UI.escapeHtml(c.name)} (${c.age || ''} yrs)
        </button>
      `).join('');
    }

    renderActiveChildContent();
  } catch (err) {
    console.error('Load parent overview error:', err);
  }
}

function selectChild(childId) {
  activeChildId = childId;
  loadParentOverview();
}

function renderActiveChildContent() {
  const container = document.getElementById('activeChildContent');
  if (!container || !parentData || parentData.children.length === 0) return;

  const child = parentData.children.find(c => c.id === activeChildId) || parentData.children[0];
  if (!child) return;

  container.innerHTML = `
    <!-- Child Quick Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-title">Enrolled Course</span>
          <div class="stat-icon emerald"><i class="fas fa-book-open"></i></div>
        </div>
        <div class="stat-value" style="font-size:1.25rem;">${UI.escapeHtml(child.course_title || 'Quran')}</div>
        <div class="stat-card-footer">
          <span>Instructor: <strong>${UI.escapeHtml(child.teacher_name || 'Assigned Qari')}</strong></span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-title">Attendance Rate</span>
          <div class="stat-icon gold"><i class="fas fa-clipboard-check"></i></div>
        </div>
        <div class="stat-value">${child.attendancePct || 100}%</div>
        <div class="stat-card-footer">
          <span class="stat-trend-up">Punctual & Regular</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-title">Current Lesson</span>
          <div class="stat-icon blue"><i class="fas fa-quran"></i></div>
        </div>
        <div class="stat-value" style="font-size:1.25rem;">
          ${child.lastProgress ? `Surah ${UI.escapeHtml(child.lastProgress.surah_name)}` : 'Active Track'}
        </div>
        <div class="stat-card-footer">
          <span>${child.lastProgress ? `Evaluation: <strong style="color:var(--success-color);">${child.lastProgress.tajweed_rating || 'Good'}</strong>` : 'Starting syllabus'}</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-title">Pending Homework</span>
          <div class="stat-icon emerald"><i class="fas fa-tasks"></i></div>
        </div>
        <div class="stat-value">${child.pendingHomeworkCount || 0}</div>
        <div class="stat-card-footer">
          <span>Assignments to complete</span>
        </div>
      </div>
    </div>

    <!-- Classroom & Teacher Card -->
    <div class="card" style="background:var(--bg-surface);">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
        <div>
          <h4 style="font-size:1.1rem; font-weight:800; color:var(--text-primary);">${UI.escapeHtml(child.name)}'s Online Classroom</h4>
          <p style="font-size:0.85rem; color:var(--text-muted); margin-top:2px;">
            Instructor: <strong>${UI.escapeHtml(child.teacher_name || 'Quranora Qari')}</strong> • Timezone: ${child.timezone || 'UTC'}
          </p>
        </div>
        <a href="${child.teacher_zoom_link || 'https://meet.google.com'}" target="_blank" class="btn btn-gold">
          <i class="fas fa-video"></i> JOIN ONLINE CLASSROOM
        </a>
      </div>
    </div>
  `;
}

/* ==========================================================================
   2. Family Timetable
   ========================================================================== */
function renderFamilyTimetable() {
  const tbody = document.getElementById('familyClassesTbody');
  if (!tbody || !parentData) return;

  if (parentData.familyClasses.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted);">No scheduled classes yet.</td></tr>';
    return;
  }

  tbody.innerHTML = parentData.familyClasses.map(cl => `
    <tr>
      <td><strong>${UI.escapeHtml(cl.student_name)}</strong></td>
      <td>${cl.days_of_week.map(d => `<span class="badge badge-active" style="margin:1px;">${d}</span>`).join(' ')}</td>
      <td><strong>${UI.formatTime(cl.start_time)} - ${UI.formatTime(cl.end_time)}</strong></td>
      <td><span class="badge badge-pending">${UI.escapeHtml(cl.course_title)}</span></td>
      <td>${UI.escapeHtml(cl.teacher_name)}</td>
      <td>
        <a href="${cl.meeting_link || 'https://meet.google.com'}" target="_blank" class="btn btn-gold btn-sm">
          <i class="fas fa-video"></i> Join Class
        </a>
      </td>
    </tr>
  `).join('');
}

/* ==========================================================================
   3. Progress, Attendance, Homework, Fees
   ========================================================================== */
async function loadParentProgress() {
  if (!activeChildId) return;
  try {
    const res = await ApiClient.get(`/api/parent/children/${activeChildId}/details`);
    if (!res.success) return;

    const tbody = document.getElementById('parentProgressTbody');
    if (!tbody) return;

    tbody.innerHTML = res.progressHistory.map(l => `
      <tr>
        <td><strong>${UI.formatDate(l.date)}</strong></td>
        <td><strong>${UI.escapeHtml(res.child.name)}</strong></td>
        <td><strong style="color:var(--accent-gold);">Surah ${UI.escapeHtml(l.surah_name)}</strong> (Ayahs ${l.ayah_from || 1}-${l.ayah_to || 'end'})</td>
        <td>Juz ${l.juz_number || 1}</td>
        <td><span class="badge badge-active">${l.tajweed_rating || 'Good'}</span></td>
        <td><span class="badge badge-pending">${l.revision_status || 'Sabaq'}</span></td>
        <td style="font-size:0.85rem;">${UI.escapeHtml(l.teacher_notes || '—')}</td>
      </tr>
    `).join('');
  } catch (err) {}
}

async function loadParentAttendance() {
  if (!activeChildId) return;
  try {
    const res = await ApiClient.get(`/api/parent/children/${activeChildId}/details`);
    if (!res.success) return;

    const tbody = document.getElementById('parentAttendanceTbody');
    if (!tbody) return;

    tbody.innerHTML = res.attendanceHistory.map(a => `
      <tr>
        <td><strong>${UI.formatDate(a.date)}</strong></td>
        <td><strong>${UI.escapeHtml(res.child.name)}</strong></td>
        <td>${UI.escapeHtml(res.teacher ? res.teacher.name : 'Teacher')}</td>
        <td><span class="badge badge-${a.status.toLowerCase()}">${a.status}</span></td>
        <td style="font-size:0.85rem; color:var(--text-muted);">${UI.escapeHtml(a.teacher_notes || '—')}</td>
      </tr>
    `).join('');
  } catch (err) {}
}

async function loadParentHomework() {
  if (!activeChildId) return;
  try {
    const res = await ApiClient.get(`/api/parent/children/${activeChildId}/details`);
    if (!res.success) return;

    const tbody = document.getElementById('parentHomeworkTbody');
    if (!tbody) return;

    tbody.innerHTML = res.homework.map(h => `
      <tr>
        <td><strong>${UI.escapeHtml(h.title)}</strong></td>
        <td>${UI.escapeHtml(res.child.name)}</td>
        <td><strong>${UI.formatDate(h.due_date)}</strong></td>
        <td><span class="badge badge-${h.status.toLowerCase()}">${h.status}</span></td>
        <td>
          ${h.grade ? `<span class="badge badge-active">${h.grade}</span> <div style="font-size:0.75rem; color:var(--text-muted);">${UI.escapeHtml(h.teacher_feedback || '')}</div>` : '<span style="color:var(--text-muted);">In progress</span>'}
        </td>
      </tr>
    `).join('');
  } catch (err) {}
}

async function loadParentFees() {
  try {
    const res = await ApiClient.get('/api/parent/fees');
    if (!res.success) return;

    const tbody = document.getElementById('parentFeesTbody');
    if (!tbody) return;

    tbody.innerHTML = res.invoices.map(inv => `
      <tr>
        <td><strong>${inv.invoice_number}</strong></td>
        <td><strong>${UI.escapeHtml(inv.student_name)}</strong></td>
        <td>${inv.month_year}</td>
        <td>${UI.formatCurrency(inv.gross_amount, inv.currency)}</td>
        <td style="color:var(--success-color); font-weight:700;">-${UI.formatCurrency(inv.discount, inv.currency)} (10%)</td>
        <td><strong>${UI.formatCurrency(inv.net_amount, inv.currency)}</strong></td>
        <td><span class="badge badge-${inv.status.toLowerCase()}">${inv.status}</span></td>
      </tr>
    `).join('');
  } catch (err) {}
}

/* ==========================================================================
   4. Messages
   ========================================================================== */
async function loadParentMessages() {
  try {
    const res = await ApiClient.get('/api/messages/contacts');
    if (!res.success) return;

    const container = document.getElementById('parentContactsContainer');
    if (!container) return;

    container.innerHTML = res.contacts.map(c => `
      <div class="chat-contact-item" onclick="openParentChatThread(${c.id}, '${UI.escapeHtml(c.name)}')">
        <img src="${c.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}" class="user-avatar-mini" />
        <div style="flex:1; overflow:hidden;">
          <div style="font-weight:700; font-size:0.85rem;">${UI.escapeHtml(c.name)}</div>
          <div style="font-size:0.7rem; color:var(--accent-gold); text-transform:uppercase;">${c.role}</div>
        </div>
      </div>
    `).join('');
  } catch (err) {}
}

async function openParentChatThread(contactId, name) {
  activeParentChatContactId = contactId;
  document.getElementById('parentChatContactName').textContent = name;

  try {
    const res = await ApiClient.get(`/api/messages/thread/${contactId}`);
    if (!res.success) return;

    const messagesArea = document.getElementById('parentChatMessagesArea');
    if (!messagesArea) return;

    const user = ApiClient.getUser();
    messagesArea.innerHTML = res.thread.map(msg => `
      <div class="chat-bubble ${msg.sender_id === user.id ? 'sent' : 'received'}">
        <div>${UI.escapeHtml(msg.content)}</div>
        <div class="chat-timestamp">${UI.formatTime(msg.sent_at?.slice(11, 16) || '')}</div>
      </div>
    `).join('');

    messagesArea.scrollTop = messagesArea.scrollHeight;
  } catch (err) {}
}

function handleParentChatKeyPress(e) {
  if (e.key === 'Enter') sendParentMessage();
}

async function sendParentMessage() {
  if (!activeParentChatContactId) {
    UI.showToast('Please select a contact first.', 'warning');
    return;
  }

  const input = document.getElementById('parentChatInput');
  const content = input.value.trim();
  if (!content) return;

  try {
    const res = await ApiClient.post('/api/messages/send', { receiver_id: activeParentChatContactId, content });
    if (res.success) {
      input.value = '';
      openParentChatThread(activeParentChatContactId, document.getElementById('parentChatContactName').textContent);
    }
  } catch (err) {}
}

async function loadParentNotifications() {
  try {
    const res = await ApiClient.get('/api/notifications');
    if (!res.success) return;

    const list = document.getElementById('notifList');
    const dot = document.getElementById('notifDot');
    if (dot) dot.style.display = res.unreadCount > 0 ? 'block' : 'none';

    if (list && res.notifications.length > 0) {
      list.innerHTML = res.notifications.map(n => `
        <div style="padding:0.5rem; border-bottom:1px solid var(--border-color); font-size:0.8rem;">
          <strong>${UI.escapeHtml(n.title)}</strong>
          <div style="color:var(--text-muted);">${UI.escapeHtml(n.message)}</div>
        </div>
      `).join('');
    }
  } catch (err) {}
}

function toggleDropdown(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('show');
}

window.quickRoleSwitch = async function(demoKey) {
  try {
    const res = await ApiClient.post('/api/auth/demo-switch', { demoKey });
    if (res.success) {
      ApiClient.setToken(res.token);
      ApiClient.setUser(res.user);
      window.location.href = res.redirectUrl;
    }
  } catch (err) {}
};
