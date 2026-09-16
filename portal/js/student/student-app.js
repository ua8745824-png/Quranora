/**
 * Quranora Portal - Student SPA Controller
 */

let studentOverviewData = null;
let activeStudentChatContactId = null;

document.addEventListener('DOMContentLoaded', async () => {
  const user = ApiClient.getUser();
  if (!user || user.role !== 'student') {
    window.location.href = '/login';
    return;
  }

  setupStudentNavigation();
  await loadStudentDashboard();
  loadStudentNotifications();
});

function setupStudentNavigation() {
  const navItems = document.querySelectorAll('#sidebarNav .nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const module = item.getAttribute('data-module');
      if (module) switchStudentModule(module);
    });
  });

  const toggleBtn = document.getElementById('mobileSidebarToggle');
  const sidebar = document.getElementById('portalSidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
  }
}

function switchStudentModule(moduleName) {
  document.querySelectorAll('#sidebarNav .nav-item').forEach(el => {
    if (el.getAttribute('data-module') === moduleName) el.classList.add('active');
    else el.classList.remove('active');
  });

  document.querySelectorAll('.module-view').forEach(view => view.classList.remove('active'));
  const targetView = document.getElementById(`module-${moduleName}`);
  if (targetView) targetView.classList.add('active');

  const titles = {
    dashboard: 'Student Dashboard',
    schedule: 'Class Schedule',
    'quran-progress': 'Visual Quran Progress Map',
    attendance: 'Attendance Record',
    homework: 'Homework & Assignments',
    fees: 'Tuition Fees & Invoices',
    resources: 'Digital Quran Library',
    messages: 'Chat with Instructor'
  };
  const titleEl = document.getElementById('pageTitle');
  if (titleEl) titleEl.textContent = titles[moduleName] || 'Student Portal';

  const sidebar = document.getElementById('portalSidebar');
  if (sidebar) sidebar.classList.remove('open');

  switch (moduleName) {
    case 'dashboard':
      loadStudentDashboard();
      break;
    case 'schedule':
      loadStudentSchedule();
      break;
    case 'quran-progress':
      loadStudentProgress();
      break;
    case 'attendance':
      loadStudentAttendance();
      break;
    case 'homework':
      loadStudentHomework();
      break;
    case 'fees':
      loadStudentFees();
      break;
    case 'resources':
      loadStudentResources();
      break;
    case 'messages':
      loadStudentMessages();
      break;
  }
}

/* ==========================================================================
   1. Dashboard Loader
   ========================================================================== */
async function loadStudentDashboard() {
  try {
    const res = await ApiClient.get('/api/student/overview');
    if (!res.success) return;

    studentOverviewData = res;

    // Header & Sidebar details
    document.getElementById('studentNameDisplay').textContent = res.student.name;
    document.getElementById('dashStudentName').textContent = res.student.name.split(' ')[0];
    if (res.course) {
      document.getElementById('studentCourseBadge').textContent = res.course.title.toUpperCase();
      document.getElementById('dashCourseTitle').textContent = res.course.title;
    }
    if (res.teacher) {
      document.getElementById('dashTeacherName').textContent = `Instructor: ${res.teacher.name}`;
    }

    // Next Class card
    const joinBtn = document.getElementById('joinClassBtn');
    const timeEl = document.getElementById('nextClassTime');
    const teacherEl = document.getElementById('nextClassTeacher');

    if (res.todayClass) {
      timeEl.textContent = `Today @ ${UI.formatTime(res.todayClass.start_time)}`;
      teacherEl.textContent = `with ${res.todayClass.teacher_name}`;
      joinBtn.href = res.todayClass.meeting_link || (res.teacher ? res.teacher.zoom_link : 'https://meet.google.com');
      joinBtn.style.display = 'inline-flex';
    } else if (res.nextClass) {
      timeEl.textContent = `${res.nextClass.days_of_week[0]} @ ${UI.formatTime(res.nextClass.start_time)}`;
      teacherEl.textContent = `with ${res.nextClass.teacher_name}`;
      joinBtn.href = res.nextClass.meeting_link || 'https://meet.google.com';
      joinBtn.style.display = 'inline-flex';
    } else {
      timeEl.textContent = 'No upcoming class';
      teacherEl.textContent = 'Contact admin to assign schedule';
      joinBtn.style.display = 'none';
    }

    // Attendance
    document.getElementById('dashAttendancePct').textContent = `${res.attendanceStats.percentage}%`;
    document.getElementById('dashAttendanceDetails').textContent = `${res.attendanceStats.presentCount} of ${res.attendanceStats.total} classes attended`;

    // Last Quran Lesson
    if (res.lastProgress) {
      document.getElementById('dashCurrentLesson').textContent = `Surah ${res.lastProgress.surah_name}`;
      document.getElementById('dashTajweedRating').textContent = res.lastProgress.tajweed_rating || 'Good';
      document.getElementById('dashRecentProgressBox').innerHTML = `
        <div style="font-size:0.9rem; color:var(--accent-gold); font-weight:700;">
          Surah ${res.lastProgress.surah_name} (Ayahs ${res.lastProgress.ayah_from || 1}-${res.lastProgress.ayah_to || 'end'}) • Juz ${res.lastProgress.juz_number || 1}
        </div>
        <div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">
          ${res.lastProgress.teacher_notes ? `Teacher advice: "${res.lastProgress.teacher_notes}"` : 'Keep up the great recitation pace!'}
        </div>
      `;
    } else {
      document.getElementById('dashCurrentLesson').textContent = 'Nazra Foundation';
      document.getElementById('dashRecentProgressBox').innerHTML = '<div style="color:var(--text-muted);">Starting new syllabus.</div>';
    }

    // Fee Status
    if (res.currentFee) {
      const feeStatusEl = document.getElementById('dashFeeStatus');
      feeStatusEl.textContent = res.currentFee.status;
      feeStatusEl.style.color = res.currentFee.status === 'PAID' ? 'var(--success-color)' : 'var(--danger-color)';
      document.getElementById('dashFeeAmount').textContent = `${res.currentFee.month_year}: ${UI.formatCurrency(res.currentFee.net_amount, res.currentFee.currency)}`;
    }

    // Render 30 Juz Mini Grid
    renderJuzGrid('juzMiniGrid', res.lastProgress?.juz_number || 1, res.hifzRecord?.current_juz || 1);

    // Pending Homework
    const hwList = document.getElementById('dashPendingHomeworkList');
    if (hwList) {
      if (res.pendingHomeworkList.length === 0) {
        hwList.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:1rem;">No pending homework!</div>';
      } else {
        hwList.innerHTML = res.pendingHomeworkList.map(h => `
          <div style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:0.75rem 1rem; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <strong>${UI.escapeHtml(h.title)}</strong>
              <div style="font-size:0.75rem; color:var(--accent-gold);">Due: ${UI.formatDate(h.due_date)}</div>
            </div>
            <button class="btn btn-gold btn-sm" onclick="openSubmitHomeworkModal(${h.id}, '${UI.escapeHtml(h.title)}', '${UI.escapeHtml(h.description)}')">
              Submit
            </button>
          </div>
        `).join('');
      }
    }
  } catch (err) {
    console.error('Load student dashboard error:', err);
  }
}

function renderJuzGrid(containerId, currentJuz = 1, hifzJuz = 1) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = Array.from({ length: 30 }, (_, i) => {
    const juzNum = i + 1;
    let cls = '';
    if (juzNum < hifzJuz) cls = 'completed';
    else if (juzNum === hifzJuz || juzNum === currentJuz) cls = 'in-progress';

    return `<div class="juz-box ${cls}" title="Juz ${juzNum}">J${juzNum}</div>`;
  }).join('');
}

/* ==========================================================================
   2. Class Schedule
   ========================================================================== */
async function loadStudentSchedule() {
  try {
    const res = await ApiClient.get('/api/student/classes');
    if (!res.success) return;

    const tbody = document.getElementById('studentClassesTbody');
    if (!tbody) return;

    tbody.innerHTML = res.classes.map(cl => `
      <tr>
        <td>${cl.days_of_week.map(d => `<span class="badge badge-active" style="margin:1px;">${d}</span>`).join(' ')}</td>
        <td><strong>${UI.formatTime(cl.start_time)} - ${UI.formatTime(cl.end_time)}</strong> (${cl.timezone || 'UTC'})</td>
        <td><span class="badge badge-active">${UI.escapeHtml(cl.course_title)}</span></td>
        <td><strong>${UI.escapeHtml(cl.teacher_name)}</strong></td>
        <td>
          <a href="${cl.meeting_link || cl.teacher_zoom_link || 'https://meet.google.com'}" target="_blank" class="btn btn-gold btn-sm">
            <i class="fas fa-video"></i> JOIN CLASS
          </a>
        </td>
      </tr>
    `).join('');
  } catch (err) {}
}

/* ==========================================================================
   3. Visual Quran Progress
   ========================================================================== */
async function loadStudentProgress() {
  try {
    const res = await ApiClient.get('/api/student/quran-progress');
    if (!res.success) return;

    renderJuzGrid('juzFullGrid', res.logs[0]?.juz_number || 1, res.hifzRecord?.current_juz || 1);

    const tbody = document.getElementById('studentProgressTbody');
    if (!tbody) return;

    if (res.logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-muted);">No lesson records logged yet.</td></tr>';
      return;
    }

    tbody.innerHTML = res.logs.map(l => `
      <tr>
        <td><strong>${UI.formatDate(l.date)}</strong></td>
        <td><strong style="color:var(--accent-gold);">Surah ${UI.escapeHtml(l.surah_name)}</strong> (Ayahs ${l.ayah_from || 1}-${l.ayah_to || 'end'})</td>
        <td>Juz ${l.juz_number || 1}</td>
        <td><span class="badge badge-pending">${l.revision_status || 'Sabaq'}</span></td>
        <td><span class="badge badge-active">${l.tajweed_rating || 'Good'}</span></td>
        <td>${l.reading_rating || 'Normal'}</td>
        <td style="font-size:0.85rem;">${UI.escapeHtml(l.teacher_notes || '—')}</td>
      </tr>
    `).join('');
  } catch (err) {}
}

/* ==========================================================================
   4. Attendance History
   ========================================================================== */
async function loadStudentAttendance() {
  try {
    const res = await ApiClient.get('/api/student/attendance');
    if (!res.success) return;

    const tbody = document.getElementById('studentAttendanceTbody');
    if (!tbody) return;

    tbody.innerHTML = res.attendance.map(a => `
      <tr>
        <td><strong>${UI.formatDate(a.date)}</strong></td>
        <td>${UI.escapeHtml(a.teacher_name)}</td>
        <td><span class="badge badge-${a.status.toLowerCase()}">${a.status}</span></td>
        <td style="font-size:0.85rem; color:var(--text-muted);">${UI.escapeHtml(a.teacher_notes || 'Session completed.')}</td>
      </tr>
    `).join('');
  } catch (err) {}
}

/* ==========================================================================
   5. Homework & Submissions
   ========================================================================== */
async function loadStudentHomework() {
  try {
    const res = await ApiClient.get('/api/student/homework');
    if (!res.success) return;

    const tbody = document.getElementById('studentHomeworkTbody');
    if (!tbody) return;

    tbody.innerHTML = res.homework.map(h => `
      <tr>
        <td>
          <strong>${UI.escapeHtml(h.title)}</strong>
          <div style="font-size:0.78rem; color:var(--text-muted);">${UI.escapeHtml(h.description)}</div>
        </td>
        <td><strong>${UI.formatDate(h.due_date)}</strong></td>
        <td><span class="badge badge-${h.status.toLowerCase()}">${h.status}</span></td>
        <td>
          ${h.submission_text ? `<div>${UI.escapeHtml(h.submission_text)}</div>` : '<span style="color:var(--text-muted);">Not submitted</span>'}
        </td>
        <td>
          ${h.grade ? `<span class="badge badge-active">${h.grade}</span> <div style="font-size:0.75rem; color:var(--text-muted);">${UI.escapeHtml(h.teacher_feedback || '')}</div>` : '<span style="color:var(--text-muted);">Pending Review</span>'}
        </td>
        <td>
          <button class="btn btn-gold btn-sm" onclick="openSubmitHomeworkModal(${h.id}, '${UI.escapeHtml(h.title)}', '${UI.escapeHtml(h.description)}')">
            <i class="fas fa-upload"></i> ${h.submission_id ? 'Resubmit' : 'Submit'}
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {}
}

function openSubmitHomeworkModal(hwId, title, desc) {
  document.getElementById('subHwId').value = hwId;
  document.getElementById('subHwTitle').textContent = title;
  document.getElementById('subHwDesc').textContent = desc;
  document.getElementById('subText').value = '';
  document.getElementById('subFileUrl').value = '';
  UI.openModal('submitHomeworkModal');
}

async function submitHomeworkAction() {
  const hwId = document.getElementById('subHwId').value;
  const submission_text = document.getElementById('subText').value.trim();
  const file_url = document.getElementById('subFileUrl').value.trim();

  if (!submission_text && !file_url) {
    UI.showToast('Please provide recitation notes or audio link.', 'warning');
    return;
  }

  try {
    const res = await ApiClient.post(`/api/student/homework/${hwId}/submit`, { submission_text, file_url });
    if (res.success) {
      UI.closeModal('submitHomeworkModal');
      UI.showToast('Homework submitted successfully!', 'success');
      loadStudentHomework();
      loadStudentDashboard();
    }
  } catch (err) {}
}

/* ==========================================================================
   6. Fees & Invoices
   ========================================================================== */
async function loadStudentFees() {
  try {
    const res = await ApiClient.get('/api/student/fees');
    if (!res.success) return;

    const tbody = document.getElementById('studentFeesTbody');
    if (!tbody) return;

    tbody.innerHTML = res.invoices.map(inv => `
      <tr>
        <td><strong>${inv.invoice_number}</strong></td>
        <td>${inv.month_year}</td>
        <td>${UI.formatCurrency(inv.gross_amount, inv.currency)}</td>
        <td>${UI.formatCurrency(inv.discount, inv.currency)}</td>
        <td style="color:var(--success-color); font-weight:700;">${UI.formatCurrency(inv.paid_amount, inv.currency)}</td>
        <td style="color:${inv.pending_amount > 0 ? 'var(--danger-color)' : 'var(--text-muted)'}; font-weight:700;">${UI.formatCurrency(inv.pending_amount, inv.currency)}</td>
        <td>${UI.formatDate(inv.due_date)}</td>
        <td><span class="badge badge-${inv.status.toLowerCase()}">${inv.status}</span></td>
      </tr>
    `).join('');
  } catch (err) {}
}

/* ==========================================================================
   7. Quran Resources Library
   ========================================================================== */
async function loadStudentResources() {
  try {
    const res = await ApiClient.get('/api/student/resources');
    if (!res.success) return;

    const grid = document.getElementById('resourcesGrid');
    if (!grid) return;

    grid.innerHTML = res.resources.map(r => `
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-title">${r.category}</span>
          <div class="stat-icon emerald"><i class="fas fa-file-pdf"></i></div>
        </div>
        <h4 style="font-size:1.05rem; font-weight:800; color:var(--text-primary); margin:4px 0;">${UI.escapeHtml(r.title)}</h4>
        <p style="font-size:0.82rem; color:var(--text-muted);">${UI.escapeHtml(r.description)}</p>
        <button class="btn btn-gold btn-sm" style="margin-top:auto;" onclick="alert('Downloading: ${r.title}')">
          <i class="fas fa-download"></i> Access PDF Material
        </button>
      </div>
    `).join('');
  } catch (err) {}
}

/* ==========================================================================
   8. Messages
   ========================================================================== */
async function loadStudentMessages() {
  try {
    const res = await ApiClient.get('/api/messages/contacts');
    if (!res.success) return;

    const container = document.getElementById('studentContactsContainer');
    if (!container) return;

    container.innerHTML = res.contacts.map(c => `
      <div class="chat-contact-item" onclick="openStudentChatThread(${c.id}, '${UI.escapeHtml(c.name)}')">
        <img src="${c.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}" class="user-avatar-mini" />
        <div style="flex:1; overflow:hidden;">
          <div style="font-weight:700; font-size:0.85rem;">${UI.escapeHtml(c.name)}</div>
          <div style="font-size:0.7rem; color:var(--accent-gold); text-transform:uppercase;">${c.role}</div>
        </div>
      </div>
    `).join('');
  } catch (err) {}
}

async function openStudentChatThread(contactId, name) {
  activeStudentChatContactId = contactId;
  document.getElementById('studentChatContactName').textContent = name;

  try {
    const res = await ApiClient.get(`/api/messages/thread/${contactId}`);
    if (!res.success) return;

    const messagesArea = document.getElementById('studentChatMessagesArea');
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

function handleStudentChatKeyPress(e) {
  if (e.key === 'Enter') sendStudentMessage();
}

async function sendStudentMessage() {
  if (!activeStudentChatContactId) {
    UI.showToast('Please select a contact first.', 'warning');
    return;
  }

  const input = document.getElementById('studentChatInput');
  const content = input.value.trim();
  if (!content) return;

  try {
    const res = await ApiClient.post('/api/messages/send', { receiver_id: activeStudentChatContactId, content });
    if (res.success) {
      input.value = '';
      openStudentChatThread(activeStudentChatContactId, document.getElementById('studentChatContactName').textContent);
    }
  } catch (err) {}
}

async function loadStudentNotifications() {
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
