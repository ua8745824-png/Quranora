/**
 * Quranora Portal - Teacher SPA Controller
 */

let teacherData = {
  profile: null,
  students: [],
  classes: [],
  homework: []
};
let activeTeacherChatContactId = null;

document.addEventListener('DOMContentLoaded', async () => {
  const user = ApiClient.getUser();
  if (!user || user.role !== 'teacher') {
    window.location.href = '/login';
    return;
  }

  setupTeacherNavigation();
  initSurahAndJuzPickers();
  await loadTeacherOverview();
  await loadTeacherStudents();
  loadTeacherNotifications();

  // Setup form submission handlers
  setupFormHandlers();
});

function setupTeacherNavigation() {
  const navItems = document.querySelectorAll('#sidebarNav .nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const module = item.getAttribute('data-module');
      if (module) {
        switchTeacherModule(module);
      }
    });
  });

  const toggleBtn = document.getElementById('mobileSidebarToggle');
  const sidebar = document.getElementById('portalSidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
  }
}

function switchTeacherModule(moduleName) {
  document.querySelectorAll('#sidebarNav .nav-item').forEach(el => {
    if (el.getAttribute('data-module') === moduleName) el.classList.add('active');
    else el.classList.remove('active');
  });

  document.querySelectorAll('.module-view').forEach(view => view.classList.remove('active'));
  const targetView = document.getElementById(`module-${moduleName}`);
  if (targetView) targetView.classList.add('active');

  const titles = {
    dashboard: 'Teacher Dashboard',
    students: 'My Assigned Students',
    classes: 'Class Timetable',
    attendance: 'Mark Attendance',
    'quran-progress': 'Record Quran Progress',
    homework: 'Homework & Assignments',
    notes: 'Student Diary & Evaluation',
    messages: 'Direct Communications',
    profile: 'Teacher Profile & Settings'
  };
  const titleEl = document.getElementById('pageTitle');
  if (titleEl) titleEl.textContent = titles[moduleName] || 'Teacher Portal';

  const sidebar = document.getElementById('portalSidebar');
  if (sidebar) sidebar.classList.remove('open');

  switch (moduleName) {
    case 'dashboard':
      loadTeacherOverview();
      break;
    case 'students':
      loadTeacherStudents();
      break;
    case 'classes':
      loadTeacherClasses();
      break;
    case 'homework':
      loadTeacherHomework();
      break;
    case 'messages':
      loadTeacherMessages();
      break;
    case 'profile':
      loadTeacherProfile();
      break;
  }
}

function initSurahAndJuzPickers() {
  // Populate Surahs (1-114)
  const surahSelect = document.getElementById('progSurahSelect');
  if (surahSelect && window.QuranMeta) {
    surahSelect.innerHTML = window.QuranMeta.QURAN_SURAHS.map(s => `
      <option value="${s.number}">${s.number}. ${s.name} (${s.arabic}) - ${s.ayahs} Ayahs</option>
    `).join('');
  }

  // Populate Juz (1-30)
  const juzSelect = document.getElementById('progJuzSelect');
  if (juzSelect && window.QuranMeta) {
    juzSelect.innerHTML = window.QuranMeta.JUZ_LIST.map(j => `
      <option value="${j.juzNumber}">Juz ${j.juzNumber} (${j.arabic})</option>
    `).join('');
  }

  // Pre-fill today's date
  const today = new Date().toISOString().slice(0, 10);
  const attDate = document.getElementById('attDate');
  if (attDate) attDate.value = today;
  const progDate = document.getElementById('progDate');
  if (progDate) progDate.value = today;
}

/* ==========================================================================
   1. Dashboard Overview Loader
   ========================================================================== */
async function loadTeacherOverview() {
  try {
    const res = await ApiClient.get('/api/teacher/overview');
    if (!res.success) return;

    teacherData.profile = res.teacher;

    // Update Header/Sidebar details
    const nameEl = document.getElementById('teacherNameDisplay');
    const avatarEl = document.getElementById('teacherAvatar');
    if (nameEl) nameEl.textContent = res.teacher.name;
    if (avatarEl && res.teacher.zoom_link) {
      // Keep avatar intact
    }

    document.getElementById('kpiMyStudents').textContent = res.stats.myStudentsCount;
    document.getElementById('kpiTodayClasses').textContent = res.stats.todayClassesCount;
    document.getElementById('kpiPendingGrading').textContent = res.stats.pendingGradingCount;

    // Today's classes table
    const tbody = document.getElementById('teacherTodayClassesTbody');
    if (tbody) {
      if (res.todayClasses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:1.5rem;">No classes scheduled for today.</td></tr>';
      } else {
        tbody.innerHTML = res.todayClasses.map(cl => `
          <tr>
            <td><strong>${UI.formatTime(cl.start_time)} - ${UI.formatTime(cl.end_time)}</strong></td>
            <td><strong>${UI.escapeHtml(cl.student_name)}</strong></td>
            <td><span class="badge badge-active">${UI.escapeHtml(cl.course_title)}</span></td>
            <td>${cl.student_timezone || 'UTC'}</td>
            <td>
              <a href="${cl.meeting_link || res.teacher.zoom_link || 'https://meet.google.com'}" target="_blank" class="btn btn-gold btn-sm">
                <i class="fas fa-video"></i> JOIN CLASS
              </a>
            </td>
            <td>
              <button class="btn btn-outline btn-sm" onclick="quickMarkAttendance(${cl.student_id})">
                <i class="fas fa-check"></i> Attendance
              </button>
            </td>
          </tr>
        `).join('');
      }
    }

    // Recent progress logs
    const progressList = document.getElementById('teacherRecentProgressList');
    if (progressList) {
      if (res.recentProgress.length === 0) {
        progressList.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:1rem;">No lessons logged recently.</div>';
      } else {
        progressList.innerHTML = res.recentProgress.map(p => `
          <div style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:0.75rem 1rem;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <strong>${UI.escapeHtml(p.student_name)}</strong>
              <span style="font-size:0.75rem; color:var(--text-muted);">${UI.formatDate(p.date)}</span>
            </div>
            <div style="font-size:0.85rem; color:var(--accent-gold); margin-top:2px;">
              Surah ${UI.escapeHtml(p.surah_name)} (Ayahs ${p.ayah_from || 1}-${p.ayah_to || 'end'})
            </div>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">
              Evaluation: <span class="badge badge-active">${p.tajweed_rating || 'Good'}</span> • Stage: <span class="badge badge-pending">${p.revision_status || 'Sabaq'}</span>
            </div>
          </div>
        `).join('');
      }
    }

    // Pending submissions list
    const subList = document.getElementById('teacherPendingSubmissionsList');
    if (subList) {
      if (res.pendingSubmissions.length === 0) {
        subList.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:1rem;">All student assignments graded!</div>';
      } else {
        subList.innerHTML = res.pendingSubmissions.map(s => `
          <div style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:0.75rem 1rem; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <strong>${UI.escapeHtml(s.student_name)}</strong>
              <div style="font-size:0.82rem; color:var(--text-secondary);">${UI.escapeHtml(s.homework_title)}</div>
            </div>
            <button class="btn btn-gold btn-sm" onclick="openGradeModal(${s.homework_id}, '${UI.escapeHtml(s.homework_title)}', '${UI.escapeHtml(s.submission_text || '')}')">
              <i class="fas fa-edit"></i> Grade
            </button>
          </div>
        `).join('');
      }
    }
  } catch (err) {
    console.error('Teacher overview error:', err);
  }
}

/* ==========================================================================
   2. My Assigned Students
   ========================================================================== */
async function loadTeacherStudents() {
  try {
    const res = await ApiClient.get('/api/teacher/students');
    if (!res.success) return;

    teacherData.students = res.students;

    const tbody = document.getElementById('myStudentsTableBody');
    if (tbody) {
      tbody.innerHTML = res.students.map(s => {
        const attRate = s.total_classes > 0 ? Math.round((s.present_classes / s.total_classes) * 100) : 100;
        return `
          <tr>
            <td>
              <strong>${UI.escapeHtml(s.name)}</strong>
              <div style="font-size:0.75rem; color:var(--text-muted);">${UI.escapeHtml(s.email)} • ${s.phone || ''}</div>
            </td>
            <td><span class="badge badge-active">${UI.escapeHtml(s.course_title || 'Quran')}</span></td>
            <td>${s.age || '—'} yrs</td>
            <td>${UI.escapeHtml(s.country || 'Global')} <div style="font-size:0.72rem; color:var(--text-muted);">${s.timezone || 'UTC'}</div></td>
            <td><strong>${attRate}%</strong> (${s.present_classes}/${s.total_classes} classes)</td>
            <td>${s.last_lesson ? `<span style="color:var(--accent-gold);">${UI.escapeHtml(s.last_lesson)}</span>` : '<span style="color:var(--text-muted);">Starting new</span>'}</td>
            <td>
              <button class="btn btn-gold btn-sm" onclick="selectStudentForProgress(${s.id})">
                <i class="fas fa-quran"></i> Log Lesson
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }

    // Populate Student Pickers in Forms
    const studentOptions = res.students.map(s => `<option value="${s.id}">${s.name} (${s.course_title})</option>`).join('');
    ['attStudentSelect', 'progStudentSelect', 'hwStudentSelect', 'noteStudentSelect'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = studentOptions;
    });
  } catch (err) {
    console.error('Load teacher students error:', err);
  }
}

/* ==========================================================================
   3. Class Timetable
   ========================================================================== */
async function loadTeacherClasses() {
  try {
    const res = await ApiClient.get('/api/teacher/classes');
    if (!res.success) return;

    const tbody = document.getElementById('myClassesTableBody');
    if (!tbody) return;

    tbody.innerHTML = res.classes.map(cl => `
      <tr>
        <td><strong>${UI.escapeHtml(cl.title)}</strong></td>
        <td>${UI.escapeHtml(cl.student_name)}</td>
        <td><span class="badge badge-active">${UI.escapeHtml(cl.course_title)}</span></td>
        <td>${cl.days_of_week.map(d => `<span class="badge badge-pending" style="margin:1px;">${d.slice(0,3)}</span>`).join('')}</td>
        <td><strong>${UI.formatTime(cl.start_time)} - ${UI.formatTime(cl.end_time)}</strong></td>
        <td>${cl.student_timezone || 'UTC'} (${cl.student_country || ''})</td>
        <td>
          <a href="${cl.meeting_link || 'https://meet.google.com'}" target="_blank" class="btn btn-gold btn-sm">
            <i class="fas fa-video"></i> Launch Class
          </a>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Load classes error:', err);
  }
}

/* ==========================================================================
   4. Form Submission Handlers
   ========================================================================== */
function setupFormHandlers() {
  // Mark Attendance Form
  const attForm = document.getElementById('markAttendanceForm');
  if (attForm) {
    attForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const student_id = document.getElementById('attStudentSelect').value;
      const date = document.getElementById('attDate').value;
      const status = document.getElementById('attStatus').value;
      const teacher_notes = document.getElementById('attNotes').value;

      try {
        const res = await ApiClient.post('/api/teacher/attendance', { student_id, date, status, teacher_notes });
        if (res.success) {
          UI.showToast(res.message, 'success');
          attForm.reset();
          document.getElementById('attDate').value = new Date().toISOString().slice(0, 10);
        }
      } catch (err) {}
    });
  }

  // Record Quran Progress Form
  const progForm = document.getElementById('recordProgressForm');
  if (progForm) {
    progForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const student_id = document.getElementById('progStudentSelect').value;
      const date = document.getElementById('progDate').value;
      const surah_number = document.getElementById('progSurahSelect').value;
      const surahNameObj = window.QuranMeta ? window.QuranMeta.QURAN_SURAHS.find(s => s.number == surah_number) : null;
      const surah_name = surahNameObj ? surahNameObj.name : `Surah ${surah_number}`;
      const juz_number = document.getElementById('progJuzSelect').value;
      const ayah_from = document.getElementById('progAyahFrom').value;
      const ayah_to = document.getElementById('progAyahTo').value;
      const revision_status = document.getElementById('progStage').value;
      const tajweed_rating = document.getElementById('progTajweedRating').value;
      const reading_rating = document.getElementById('progReadingRating').value;
      const mistakes_count = document.getElementById('progMistakes').value;
      const teacher_notes = document.getElementById('progNotes').value;

      try {
        const res = await ApiClient.post('/api/teacher/quran-progress', {
          student_id,
          date,
          surah_number,
          surah_name,
          juz_number,
          ayah_from,
          ayah_to,
          revision_status,
          tajweed_rating,
          reading_rating,
          mistakes_count,
          teacher_notes
        });

        if (res.success) {
          UI.showToast('Quran progress recorded successfully!', 'success');
          progForm.reset();
          initSurahAndJuzPickers();
          loadTeacherOverview();
        }
      } catch (err) {}
    });
  }

  // Add Note Form
  const noteForm = document.getElementById('addNoteForm');
  if (noteForm) {
    noteForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const student_id = document.getElementById('noteStudentSelect').value;
      const title = document.getElementById('noteTitle').value.trim();
      const note_content = document.getElementById('noteContent').value.trim();

      try {
        const res = await ApiClient.post('/api/teacher/notes', { student_id, title, note_content });
        if (res.success) {
          UI.showToast('Evaluation note saved to diary!', 'success');
          noteForm.reset();
        }
      } catch (err) {}
    });
  }

  // Profile Form
  const profForm = document.getElementById('teacherProfileForm');
  if (profForm) {
    profForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('profName').value.trim();
      const phone = document.getElementById('profPhone').value.trim();
      const zoom_link = document.getElementById('profZoom').value.trim();
      const bio = document.getElementById('profBio').value.trim();

      try {
        const res = await ApiClient.put('/api/teacher/profile', { name, phone, zoom_link, bio });
        if (res.success) {
          UI.showToast('Profile updated!', 'success');
        }
      } catch (err) {}
    });
  }
}

function selectStudentForProgress(studentId) {
  switchTeacherModule('quran-progress');
  const sel = document.getElementById('progStudentSelect');
  if (sel) sel.value = studentId;
}

function quickMarkAttendance(studentId) {
  switchTeacherModule('attendance');
  const sel = document.getElementById('attStudentSelect');
  if (sel) sel.value = studentId;
}

/* ==========================================================================
   5. Homework & Grading
   ========================================================================== */
async function loadTeacherHomework() {
  try {
    const res = await ApiClient.get('/api/teacher/homework');
    if (!res.success) return;

    teacherData.homework = res.homework;
    const tbody = document.getElementById('teacherHomeworkTableBody');
    if (!tbody) return;

    tbody.innerHTML = res.homework.map(h => `
      <tr>
        <td>
          <strong>${UI.escapeHtml(h.title)}</strong>
          <div style="font-size:0.75rem; color:var(--text-muted);">${UI.escapeHtml(h.description)}</div>
        </td>
        <td><strong>${UI.escapeHtml(h.student_name)}</strong></td>
        <td>${UI.formatDate(h.due_date)}</td>
        <td><span class="badge badge-${h.status.toLowerCase()}">${h.status}</span></td>
        <td>
          ${h.submission_text ? `<div>${UI.escapeHtml(h.submission_text)}</div>` : '<span style="color:var(--text-muted);">No submission yet</span>'}
          ${h.file_url ? `<a href="${h.file_url}" target="_blank" style="font-size:0.75rem;"><i class="fas fa-paperclip"></i> Audio / Attachment</a>` : ''}
        </td>
        <td>
          ${h.grade ? `<span class="badge badge-active">${h.grade}</span> <div style="font-size:0.75rem; color:var(--text-muted);">${UI.escapeHtml(h.teacher_feedback || '')}</div>` : '<span style="color:var(--warning-color);">Ungraded</span>'}
        </td>
        <td>
          ${h.submission_id ? `
            <button class="btn btn-gold btn-sm" onclick="openGradeModal(${h.id}, '${UI.escapeHtml(h.title)}', '${UI.escapeHtml(h.submission_text || '')}')">
              <i class="fas fa-edit"></i> Grade
            </button>
          ` : '—'}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Load homework error:', err);
  }
}

function openCreateHomeworkModal() {
  document.getElementById('createHomeworkForm').reset();
  const dateInput = document.getElementById('hwDueDate');
  if (dateInput) {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 5);
    dateInput.value = nextWeek.toISOString().slice(0, 10);
  }
  UI.openModal('createHomeworkModal');
}

async function submitCreateHomework() {
  const student_id = document.getElementById('hwStudentSelect').value;
  const title = document.getElementById('hwTitle').value.trim();
  const description = document.getElementById('hwDesc').value.trim();
  const due_date = document.getElementById('hwDueDate').value;

  if (!student_id || !title || !description || !due_date) {
    UI.showToast('Please fill all homework fields.', 'warning');
    return;
  }

  try {
    const res = await ApiClient.post('/api/teacher/homework', { student_id, title, description, due_date });
    if (res.success) {
      UI.closeModal('createHomeworkModal');
      UI.showToast('Homework assigned!', 'success');
      loadTeacherHomework();
    }
  } catch (err) {}
}

function openGradeModal(hwId, title, subText) {
  document.getElementById('gradeHwId').value = hwId;
  document.getElementById('gradeHwTitle').textContent = title;
  document.getElementById('gradeSubmissionContent').textContent = subText || 'Student submitted assignment.';
  UI.openModal('gradeSubmissionModal');
}

async function submitGrade() {
  const homeworkId = document.getElementById('gradeHwId').value;
  const grade = document.getElementById('gradeSelect').value;
  const teacher_feedback = document.getElementById('gradeFeedback').value.trim();

  try {
    const res = await ApiClient.post(`/api/teacher/homework/${homeworkId}/grade`, { grade, teacher_feedback });
    if (res.success) {
      UI.closeModal('gradeSubmissionModal');
      UI.showToast('Submission graded!', 'success');
      loadTeacherHomework();
      loadTeacherOverview();
    }
  } catch (err) {}
}

/* ==========================================================================
   6. Messages
   ========================================================================== */
async function loadTeacherMessages() {
  try {
    const res = await ApiClient.get('/api/messages/contacts');
    if (!res.success) return;

    const container = document.getElementById('teacherContactsContainer');
    if (!container) return;

    container.innerHTML = res.contacts.map(c => `
      <div class="chat-contact-item" onclick="openTeacherChatThread(${c.id}, '${UI.escapeHtml(c.name)}')">
        <img src="${c.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}" class="user-avatar-mini" />
        <div style="flex:1; overflow:hidden;">
          <div style="font-weight:700; font-size:0.85rem;">${UI.escapeHtml(c.name)}</div>
          <div style="font-size:0.7rem; color:var(--accent-gold); text-transform:uppercase;">${c.role}</div>
        </div>
      </div>
    `).join('');
  } catch (err) {}
}

async function openTeacherChatThread(contactId, name) {
  activeTeacherChatContactId = contactId;
  document.getElementById('teacherChatContactName').textContent = name;

  try {
    const res = await ApiClient.get(`/api/messages/thread/${contactId}`);
    if (!res.success) return;

    const messagesArea = document.getElementById('teacherChatMessagesArea');
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

function handleTeacherChatKeyPress(e) {
  if (e.key === 'Enter') sendTeacherMessage();
}

async function sendTeacherMessage() {
  if (!activeTeacherChatContactId) {
    UI.showToast('Please select a contact first.', 'warning');
    return;
  }

  const input = document.getElementById('teacherChatInput');
  const content = input.value.trim();
  if (!content) return;

  try {
    const res = await ApiClient.post('/api/messages/send', { receiver_id: activeTeacherChatContactId, content });
    if (res.success) {
      input.value = '';
      openTeacherChatThread(activeTeacherChatContactId, document.getElementById('teacherChatContactName').textContent);
    }
  } catch (err) {}
}

/* ==========================================================================
   7. Profile Loader
   ========================================================================== */
function loadTeacherProfile() {
  if (teacherData.profile) {
    document.getElementById('profName').value = teacherData.profile.name || '';
    document.getElementById('profPhone').value = teacherData.profile.phone || '';
    document.getElementById('profZoom').value = teacherData.profile.zoom_link || '';
    document.getElementById('profBio').value = teacherData.profile.bio || '';
  }
}

async function loadTeacherNotifications() {
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
