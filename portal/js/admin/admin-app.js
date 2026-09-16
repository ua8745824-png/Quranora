/**
 * Quranora Portal - Super Admin & Staff SPA Controller
 */

let currentModule = 'dashboard';
let globalData = {
  students: [],
  teachers: [],
  courses: [],
  classes: [],
  invoices: []
};
let activeChatContactId = null;

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Authenticate admin user
  const user = ApiClient.getUser();
  if (!user || (user.role !== 'superadmin' && user.role !== 'admin')) {
    window.location.href = '/login';
    return;
  }

  // Update Topbar/Sidebar User details
  const nameEl = document.getElementById('adminNameDisplay');
  const roleEl = document.getElementById('adminRoleDisplay');
  const avatarEl = document.getElementById('adminAvatar');

  if (nameEl) nameEl.textContent = user.email.split('@')[0].toUpperCase();
  if (roleEl) roleEl.textContent = user.role === 'superadmin' ? 'SUPER ADMIN' : 'STAFF ADMIN';
  if (avatarEl && user.avatar) avatarEl.src = user.avatar;

  // 2. Setup Sidebar Module Navigation
  setupNavigation();

  // 3. Load Initial Dashboard Data
  await loadOverview();
  await loadDropdowns();
  loadNotifications();
});

function setupNavigation() {
  const navItems = document.querySelectorAll('#sidebarNav .nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const module = item.getAttribute('data-module');
      if (module) {
        switchModule(module);
      }
    });
  });

  // Mobile sidebar toggle
  const toggleBtn = document.getElementById('mobileSidebarToggle');
  const sidebar = document.getElementById('portalSidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }
}

function switchModule(moduleName, queryParams = {}) {
  currentModule = moduleName;

  // Update active sidebar item
  document.querySelectorAll('#sidebarNav .nav-item').forEach(el => {
    if (el.getAttribute('data-module') === moduleName) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });

  // Hide all module views
  document.querySelectorAll('.module-view').forEach(view => {
    view.classList.remove('active');
  });

  // Show target module view
  const targetView = document.getElementById(`module-${moduleName}`);
  if (targetView) {
    targetView.classList.add('active');
  }

  // Update Page Title
  const titleEl = document.getElementById('pageTitle');
  if (titleEl) {
    titleEl.textContent = formatModuleTitle(moduleName);
  }

  // Close mobile sidebar if open
  const sidebar = document.getElementById('portalSidebar');
  if (sidebar) sidebar.classList.remove('open');

  // Load Module-specific Data
  switch (moduleName) {
    case 'dashboard':
      loadOverview();
      break;
    case 'students':
      if (queryParams.status) {
        const filter = document.getElementById('studentStatusFilter');
        if (filter) filter.value = queryParams.status;
      }
      loadStudents();
      break;
    case 'teachers':
      loadTeachers();
      break;
    case 'parents':
      loadParents();
      break;
    case 'courses':
      loadCourses();
      break;
    case 'classes':
      loadClasses();
      break;
    case 'attendance':
      loadAttendance();
      break;
    case 'quran-progress':
      loadQuranProgress();
      break;
    case 'homework':
      loadHomework();
      break;
    case 'fees':
      loadFees();
      break;
    case 'expenses':
      loadExpenses();
      break;
    case 'messages':
      loadMessagesModule();
      break;
    case 'settings':
      loadSettings();
      break;
  }
}

function formatModuleTitle(module) {
  const titles = {
    dashboard: 'Admin Dashboard Overview',
    students: 'Student Directory & Admissions',
    teachers: 'Faculty & Teachers Directory',
    parents: 'Parents & Guardians',
    courses: 'Quran Courses Catalog',
    classes: 'Timetable & Class Scheduler',
    attendance: 'Academy Attendance Log',
    'quran-progress': 'Quran Progress & Hifz Tracking',
    homework: 'Homework & Assignments',
    fees: 'Tuition Fees & Payments',
    expenses: 'Expenses & Financial P&L',
    messages: 'Direct Internal Communications',
    reports: 'Executive Reports & Analytics',
    settings: 'Academy Settings & DB Management'
  };
  return titles[module] || 'Admin Portal';
}

/* ==========================================================================
   1. Dashboard Overview Loader
   ========================================================================== */
async function loadOverview() {
  try {
    const res = await ApiClient.get('/api/admin/overview');
    if (!res.success) return;

    const stats = res.stats;
    document.getElementById('kpiActiveStudents').textContent = stats.activeStudents;
    document.getElementById('kpiPendingStudents').textContent = `${stats.pendingStudents} pending`;
    document.getElementById('kpiTotalTeachers').textContent = stats.totalTeachers;
    document.getElementById('kpiTodayClasses').textContent = stats.todayClassesCount;
    document.getElementById('kpiMonthlyRevenue').textContent = UI.formatCurrency(stats.monthlyRevenue);
    document.getElementById('kpiPendingFees').textContent = `${UI.formatCurrency(stats.pendingFees)} pending`;

    // Pending students badge on sidebar
    const badge = document.getElementById('pendingStudentsBadge');
    if (badge) {
      if (stats.pendingStudents > 0) {
        badge.style.display = 'inline-block';
        badge.textContent = stats.pendingStudents;
      } else {
        badge.style.display = 'none';
      }
    }

    // Pending Alert Card
    const alertCard = document.getElementById('pendingAlertSection');
    if (alertCard) {
      alertCard.style.display = stats.pendingStudents > 0 ? 'block' : 'none';
    }

    // Today's classes table
    const tbody = document.getElementById('todayClassesTbody');
    if (tbody) {
      if (res.todayClasses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:1.5rem;">No classes scheduled for today.</td></tr>';
      } else {
        tbody.innerHTML = res.todayClasses.map(cl => `
          <tr>
            <td><strong>${UI.formatTime(cl.start_time)}</strong></td>
            <td><strong>${UI.escapeHtml(cl.student_name)}</strong></td>
            <td>${UI.escapeHtml(cl.teacher_name)}</td>
            <td><span class="badge badge-active">${UI.escapeHtml(cl.course_title)}</span></td>
            <td>
              <a href="${cl.meeting_link || 'https://meet.google.com'}" target="_blank" class="btn btn-gold btn-sm">
                <i class="fas fa-video"></i> Join Class
              </a>
            </td>
          </tr>
        `).join('');
      }
    }

    // Recent progress logs
    const progressList = document.getElementById('recentProgressList');
    if (progressList) {
      if (res.recentProgress.length === 0) {
        progressList.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:1rem;">No recent lesson logs recorded yet.</div>';
      } else {
        progressList.innerHTML = res.recentProgress.map(p => `
          <div style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:0.75rem 1rem;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <strong>${UI.escapeHtml(p.student_name)}</strong>
              <span style="font-size:0.75rem; color:var(--text-muted);">${UI.formatDate(p.date)}</span>
            </div>
            <div style="font-size:0.85rem; color:var(--accent-gold); margin-top:2px;">
              Surah ${UI.escapeHtml(p.surah_name)} (Ayahs ${p.ayah_from || 1}-${p.ayah_to || 'end'}) • Juz ${p.juz_number || 1}
            </div>
            <div style="font-size:0.78rem; color:var(--text-muted); margin-top:4px;">
              By ${UI.escapeHtml(p.teacher_name)} • Evaluation: <span class="badge badge-active">${p.tajweed_rating || 'Good'}</span>
            </div>
          </div>
        `).join('');
      }
    }
  } catch (err) {
    console.error('Load overview error:', err);
  }
}

/* ==========================================================================
   2. Students Management
   ========================================================================== */
let searchDebounceTimeout = null;
function debounceStudentSearch() {
  clearTimeout(searchDebounceTimeout);
  searchDebounceTimeout = setTimeout(() => {
    loadStudents();
  }, 300);
}

async function loadStudents() {
  try {
    const search = document.getElementById('studentSearchInput')?.value.trim() || '';
    const status = document.getElementById('studentStatusFilter')?.value || 'ALL';
    const course = document.getElementById('studentCourseFilter')?.value || 'ALL';
    const teacher = document.getElementById('studentTeacherFilter')?.value || 'ALL';

    const query = new URLSearchParams({ search, status, course, teacher }).toString();
    const res = await ApiClient.get(`/api/admin/students?${query}`);
    if (!res.success) return;

    globalData.students = res.students;
    const tbody = document.getElementById('studentsTableBody');
    if (!tbody) return;

    if (res.students.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-muted);">No students found matching your criteria.</td></tr>';
      return;
    }

    tbody.innerHTML = res.students.map(s => {
      let statusBadge = `<span class="badge badge-active">${s.user_status}</span>`;
      if (s.user_status === 'PENDING') statusBadge = `<span class="badge badge-pending">PENDING APPROVAL</span>`;
      else if (s.user_status === 'REJECTED') statusBadge = `<span class="badge badge-rejected">REJECTED</span>`;
      else if (s.user_status === 'SUSPENDED') statusBadge = `<span class="badge badge-suspended">SUSPENDED</span>`;

      return `
        <tr>
          <td>#${s.id}</td>
          <td>
            <strong>${UI.escapeHtml(s.name)}</strong>
            <div style="font-size:0.75rem; color:var(--text-muted);">${UI.escapeHtml(s.email)} • ${s.phone || 'No phone'}</div>
          </td>
          <td>${s.course_title ? `<span class="badge badge-active">${UI.escapeHtml(s.course_title)}</span>` : '<span style="color:var(--text-muted);">Unassigned</span>'}</td>
          <td>${s.teacher_name ? `<strong>${UI.escapeHtml(s.teacher_name)}</strong>` : '<span style="color:var(--warning-color);"><i class="fas fa-exclamation-circle"></i> Unassigned</span>'}</td>
          <td>${UI.escapeHtml(s.country || 'Global')} <div style="font-size:0.75rem; color:var(--text-muted);">${s.timezone || 'UTC'}</div></td>
          <td><strong>${UI.formatCurrency(s.monthly_fee, s.currency)}</strong></td>
          <td>${statusBadge}</td>
          <td>
            <div style="display:flex; gap:0.35rem;">
              ${s.user_status === 'PENDING' ? `
                <button class="btn btn-gold btn-sm" onclick="openReviewModal(${s.id})" title="Review & Approve Admission">
                  <i class="fas fa-user-check"></i> Review
                </button>
              ` : `
                <button class="btn btn-outline btn-sm" onclick="toggleStudentActive(${s.id}, '${s.user_status}')" title="Change status">
                  ${s.user_status === 'ACTIVE' ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>'}
                </button>
              `}
              <button class="btn btn-danger btn-sm" onclick="deleteStudent(${s.id})" title="Delete Student">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Load students error:', err);
  }
}

function openReviewModal(studentId) {
  const student = globalData.students.find(s => s.id === studentId);
  if (!student) return;

  document.getElementById('modalStudentId').value = student.id;
  document.getElementById('modalStudentName').textContent = student.name;
  document.getElementById('modalStudentDetails').textContent = `${student.email} • ${student.country} • Age ${student.age || 'N/A'}`;
  document.getElementById('modalStudentNotes').textContent = student.notes ? `Special Notes: ${student.notes}` : 'No special notes provided.';
  document.getElementById('modalStudentFee').value = student.monthly_fee || 50;

  // Preselect course and teacher dropdowns
  const teacherSelect = document.getElementById('modalAssignTeacher');
  if (teacherSelect && student.teacher_id) teacherSelect.value = student.teacher_id;

  const courseSelect = document.getElementById('modalAssignCourse');
  if (courseSelect && student.course_id) courseSelect.value = student.course_id;

  UI.openModal('approveStudentModal');
}

async function updateStudentStatus(status) {
  const studentId = document.getElementById('modalStudentId').value;
  const teacher_id = document.getElementById('modalAssignTeacher').value;
  const course_id = document.getElementById('modalAssignCourse').value;
  const monthly_fee = document.getElementById('modalStudentFee').value;

  try {
    const res = await ApiClient.post(`/api/admin/students/${studentId}/status`, {
      status,
      teacher_id,
      course_id,
      monthly_fee
    });

    if (res.success) {
      UI.closeModal('approveStudentModal');
      UI.showToast(`Student status updated to ${status}!`, 'success');
      loadStudents();
      loadOverview();
    }
  } catch (err) {
    console.error('Update status error:', err);
  }
}

async function toggleStudentActive(studentId, currentStatus) {
  const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
  if (!confirm(`Are you sure you want to change student status to ${nextStatus}?`)) return;

  try {
    const res = await ApiClient.post(`/api/admin/students/${studentId}/status`, { status: nextStatus });
    if (res.success) {
      UI.showToast(`Student status updated to ${nextStatus}`, 'success');
      loadStudents();
    }
  } catch (err) {
    console.error('Toggle status error:', err);
  }
}

async function deleteStudent(studentId) {
  if (!confirm('Are you sure you want to completely remove this student account? This action cannot be undone.')) return;
  try {
    const res = await ApiClient.delete(`/api/admin/students/${studentId}`);
    if (res.success) {
      UI.showToast('Student removed.', 'info');
      loadStudents();
      loadOverview();
    }
  } catch (err) {
    console.error('Delete student error:', err);
  }
}

function openAddStudentModal() {
  document.getElementById('addStudentForm').reset();
  UI.openModal('addStudentModal');
}

async function submitAddStudent() {
  const name = document.getElementById('addStudName').value.trim();
  const age = document.getElementById('addStudAge').value;
  const email = document.getElementById('addStudEmail').value.trim();
  const phone = document.getElementById('addStudPhone').value.trim();
  const country = document.getElementById('addStudCountry').value.trim();
  const timezone = document.getElementById('addStudTimezone').value.trim();
  const course_id = document.getElementById('addStudCourse').value;
  const teacher_id = document.getElementById('addStudTeacher').value;
  const monthly_fee = document.getElementById('addStudFee').value;

  if (!name || !email) {
    UI.showToast('Name and email are required.', 'warning');
    return;
  }

  try {
    const res = await ApiClient.post('/api/admin/students', {
      name,
      age,
      email,
      phone,
      country,
      timezone,
      course_id,
      teacher_id,
      monthly_fee,
      status: 'ACTIVE'
    });

    if (res.success) {
      UI.closeModal('addStudentModal');
      UI.showToast('Student created successfully!', 'success');
      loadStudents();
      loadOverview();
    }
  } catch (err) {
    console.error('Create student error:', err);
  }
}

/* ==========================================================================
   3. Teachers Management
   ========================================================================== */
async function loadTeachers() {
  try {
    const res = await ApiClient.get('/api/admin/teachers');
    if (!res.success) return;

    globalData.teachers = res.teachers;
    const tbody = document.getElementById('teachersTableBody');
    if (!tbody) return;

    tbody.innerHTML = res.teachers.map(t => `
      <tr>
        <td>
          <strong>${UI.escapeHtml(t.name)}</strong>
          <div style="font-size:0.75rem; color:var(--text-muted);">${UI.escapeHtml(t.email)} • ${t.phone || 'No phone'}</div>
        </td>
        <td><span class="badge ${t.gender === 'female' ? 'badge-pending' : 'badge-active'}">${t.gender}</span></td>
        <td>
          <div style="font-size:0.85rem;">${UI.escapeHtml(t.qualification || 'Certified Tutor')}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">${UI.escapeHtml(t.bio ? t.bio.slice(0, 60) + '...' : '')}</div>
        </td>
        <td><strong>${t.assigned_students_count}</strong> students</td>
        <td><strong>${t.active_classes_count}</strong> active classes</td>
        <td>${UI.formatCurrency(t.monthly_salary || 700)} / mo</td>
        <td>
          <a href="${t.zoom_link || 'https://meet.google.com'}" target="_blank" class="btn btn-outline btn-sm">
            <i class="fas fa-link"></i> Classroom Link
          </a>
        </td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="alert('Teacher profile ID: ${t.id}')">
            <i class="fas fa-edit"></i> Edit
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Load teachers error:', err);
  }
}

function openAddTeacherModal() {
  document.getElementById('addTeacherForm').reset();
  UI.openModal('addTeacherModal');
}

async function submitAddTeacher() {
  const name = document.getElementById('addTeachName').value.trim();
  const gender = document.getElementById('addTeachGender').value;
  const email = document.getElementById('addTeachEmail').value.trim();
  const phone = document.getElementById('addTeachPhone').value.trim();
  const qualification = document.getElementById('addTeachQual').value.trim();
  const zoom_link = document.getElementById('addTeachZoom').value.trim();

  if (!name || !email) {
    UI.showToast('Teacher name and email are required.', 'warning');
    return;
  }

  try {
    const res = await ApiClient.post('/api/admin/teachers', {
      name,
      gender,
      email,
      phone,
      qualification,
      zoom_link
    });

    if (res.success) {
      UI.closeModal('addTeacherModal');
      UI.showToast('Teacher added successfully!', 'success');
      loadTeachers();
    }
  } catch (err) {
    console.error('Add teacher error:', err);
  }
}

/* ==========================================================================
   4. Parents Management
   ========================================================================== */
async function loadParents() {
  try {
    const res = await ApiClient.get('/api/admin/parents');
    if (!res.success) return;

    const tbody = document.getElementById('parentsTableBody');
    if (!tbody) return;

    tbody.innerHTML = res.parents.map(p => {
      const childrenHtml = p.children && p.children.length > 0 
        ? p.children.map(c => `<span class="badge badge-active" style="margin:2px;">${UI.escapeHtml(c.name)} (${UI.escapeHtml(c.course_title || 'Quran')})</span>`).join(' ')
        : '<span style="color:var(--text-muted);">No linked children</span>';

      return `
        <tr>
          <td><strong>${UI.escapeHtml(p.name)}</strong></td>
          <td>${UI.escapeHtml(p.email)} <div style="font-size:0.75rem; color:var(--text-muted);">${p.phone || ''}</div></td>
          <td>${UI.escapeHtml(p.country || 'United Kingdom')}</td>
          <td>${childrenHtml}</td>
          <td><span class="badge badge-active">${p.user_status}</span></td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Load parents error:', err);
  }
}

/* ==========================================================================
   5. Courses Management
   ========================================================================== */
async function loadCourses() {
  try {
    const res = await ApiClient.get('/api/admin/courses');
    if (!res.success) return;

    globalData.courses = res.courses;
    const tbody = document.getElementById('coursesTableBody');
    if (!tbody) return;

    tbody.innerHTML = res.courses.map(c => `
      <tr>
        <td><strong>${UI.escapeHtml(c.title)}</strong> ${c.badge ? `<span class="badge badge-pending">${c.badge}</span>` : ''}</td>
        <td class="arabic-font">${UI.escapeHtml(c.title_ar || '')}</td>
        <td><span class="badge badge-active">${c.category}</span></td>
        <td>${c.duration_mins} mins / class</td>
        <td><strong>${UI.formatCurrency(c.fee_monthly, c.currency)}</strong> / mo</td>
        <td><strong>${c.enrolled_students}</strong> students</td>
        <td><span class="badge badge-active">${c.status}</span></td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="alert('Course: ${c.title}')">Edit</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Load courses error:', err);
  }
}

/* ==========================================================================
   6. Classes & Schedules Management
   ========================================================================== */
async function loadClasses() {
  try {
    const res = await ApiClient.get('/api/admin/classes');
    if (!res.success) return;

    globalData.classes = res.classes;
    const tbody = document.getElementById('classesTableBody');
    if (!tbody) return;

    tbody.innerHTML = res.classes.map(cl => `
      <tr>
        <td><strong>${UI.escapeHtml(cl.title)}</strong></td>
        <td>${UI.escapeHtml(cl.student_name)}</td>
        <td>${UI.escapeHtml(cl.teacher_name)}</td>
        <td><span class="badge badge-active">${UI.escapeHtml(cl.course_title)}</span></td>
        <td>${cl.days_of_week.map(d => `<span class="badge badge-pending" style="margin:1px;">${d.slice(0,3)}</span>`).join('')}</td>
        <td><strong>${UI.formatTime(cl.start_time)} - ${UI.formatTime(cl.end_time)}</strong></td>
        <td><span style="font-size:0.75rem; color:var(--text-muted);">${cl.timezone || 'UTC'}</span></td>
        <td>
          <a href="${cl.meeting_link || 'https://meet.google.com'}" target="_blank" class="btn btn-gold btn-sm">
            <i class="fas fa-video"></i> Join Link
          </a>
        </td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="deleteClass(${cl.id})"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Load classes error:', err);
  }
}

function openAddClassModal() {
  document.getElementById('addClassForm').reset();
  UI.openModal('addClassModal');
}

async function submitAddClass() {
  const title = document.getElementById('addClassTitle').value.trim();
  const student_id = document.getElementById('addClassStudent').value;
  const teacher_id = document.getElementById('addClassTeacher').value;
  const course_id = document.getElementById('addClassCourse').value;
  const start_time = document.getElementById('addClassStartTime').value;
  const end_time = document.getElementById('addClassEndTime').value;
  const meeting_link = document.getElementById('addClassMeetingLink').value.trim();

  const daysCheckboxes = document.querySelectorAll('input[name="classDay"]:checked');
  const days_of_week = Array.from(daysCheckboxes).map(cb => cb.value);

  if (!student_id || !teacher_id || !course_id || days_of_week.length === 0) {
    UI.showToast('Please fill all required class fields.', 'warning');
    return;
  }

  try {
    const res = await ApiClient.post('/api/admin/classes', {
      title,
      student_id,
      teacher_id,
      course_id,
      start_time,
      end_time,
      days_of_week,
      meeting_link
    });

    if (res.success) {
      UI.closeModal('addClassModal');
      UI.showToast('Class scheduled successfully!', 'success');
      loadClasses();
    }
  } catch (err) {
    console.error('Schedule class error:', err);
  }
}

async function deleteClass(classId) {
  if (!confirm('Remove this scheduled class?')) return;
  try {
    const res = await ApiClient.delete(`/api/admin/classes/${classId}`);
    if (res.success) {
      UI.showToast('Class removed.', 'info');
      loadClasses();
    }
  } catch (err) {
    console.error('Delete class error:', err);
  }
}

/* ==========================================================================
   7. Attendance Management
   ========================================================================== */
async function loadAttendance() {
  try {
    const date = document.getElementById('attendanceDateFilter')?.value || '';
    const query = date ? `?date=${date}` : '';
    const res = await ApiClient.get(`/api/admin/attendance${query}`);
    if (!res.success) return;

    const tbody = document.getElementById('attendanceTableBody');
    if (!tbody) return;

    if (res.records.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted);">No attendance records found for this date.</td></tr>';
      return;
    }

    tbody.innerHTML = res.records.map(a => `
      <tr>
        <td><strong>${UI.formatDate(a.date)}</strong></td>
        <td>${UI.escapeHtml(a.student_name)}</td>
        <td>${UI.escapeHtml(a.teacher_name)}</td>
        <td>${UI.escapeHtml(a.class_title || 'Session')}</td>
        <td><span class="badge badge-${a.status.toLowerCase()}">${a.status}</span></td>
        <td style="font-size:0.82rem; color:var(--text-muted);">${UI.escapeHtml(a.teacher_notes || '—')}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Load attendance error:', err);
  }
}

/* ==========================================================================
   8. Quran Progress Module
   ========================================================================== */
async function loadQuranProgress() {
  try {
    const res = await ApiClient.get('/api/admin/quran-progress');
    if (!res.success) return;

    const tbody = document.getElementById('quranProgressTableBody');
    if (!tbody) return;

    tbody.innerHTML = res.logs.map(log => `
      <tr>
        <td><strong>${UI.formatDate(log.date)}</strong></td>
        <td><strong>${UI.escapeHtml(log.student_name)}</strong></td>
        <td>${UI.escapeHtml(log.teacher_name)}</td>
        <td><span style="color:var(--accent-gold); font-weight:700;">Surah ${UI.escapeHtml(log.surah_name)}</span> (Ayahs ${log.ayah_from || 1}-${log.ayah_to || 'end'})</td>
        <td>Juz ${log.juz_number || 1}</td>
        <td><span class="badge badge-active">${log.reading_rating || 'Good'}</span></td>
        <td><span class="badge badge-active">${log.tajweed_rating || 'Good'}</span></td>
        <td><span class="badge badge-pending">${log.revision_status || 'SABAQ'}</span></td>
        <td style="font-size:0.82rem;">${UI.escapeHtml(log.teacher_notes || '—')}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Load Quran progress error:', err);
  }
}

/* ==========================================================================
   9. Homework Module
   ========================================================================== */
async function loadHomework() {
  try {
    const res = await ApiClient.get('/api/admin/homework');
    // Homework table view placeholder or direct teacher sync
  } catch (err) {}
}

/* ==========================================================================
   10. Fees & Invoices
   ========================================================================== */
async function loadFees() {
  try {
    const res = await ApiClient.get('/api/admin/fees');
    if (!res.success) return;

    globalData.invoices = res.invoices;
    const tbody = document.getElementById('feesTableBody');
    if (!tbody) return;

    tbody.innerHTML = res.invoices.map(inv => `
      <tr>
        <td><strong>${inv.invoice_number}</strong></td>
        <td>
          <strong>${UI.escapeHtml(inv.student_name)}</strong>
          <div style="font-size:0.75rem; color:var(--text-muted);">${UI.escapeHtml(inv.course_title || 'Tuition')}</div>
        </td>
        <td>${inv.month_year}</td>
        <td><strong>${UI.formatCurrency(inv.net_amount, inv.currency)}</strong></td>
        <td style="color:var(--success-color); font-weight:700;">${UI.formatCurrency(inv.paid_amount, inv.currency)}</td>
        <td style="color:${inv.pending_amount > 0 ? 'var(--danger-color)' : 'var(--text-muted)'}; font-weight:700;">${UI.formatCurrency(inv.pending_amount, inv.currency)}</td>
        <td>${UI.formatDate(inv.due_date)}</td>
        <td><span class="badge badge-${inv.status.toLowerCase()}">${inv.status}</span></td>
        <td>
          ${inv.pending_amount > 0 ? `
            <button class="btn btn-gold btn-sm" onclick="quickPayInvoice(${inv.id}, ${inv.pending_amount})">
              <i class="fas fa-check"></i> Collect
            </button>
          ` : '<span style="color:var(--success-color); font-size:0.8rem;"><i class="fas fa-check-circle"></i> Settled</span>'}
        </td>
      </tr>
    `).join('');

    // Populate invoice dropdown in Record Payment modal
    const paySelect = document.getElementById('payInvoiceSelect');
    if (paySelect) {
      paySelect.innerHTML = res.invoices.filter(i => i.status !== 'PAID').map(i => `
        <option value="${i.id}">${i.invoice_number} - ${i.student_name} (Pending: ${UI.formatCurrency(i.pending_amount, i.currency)})</option>
      `).join('');
    }
  } catch (err) {
    console.error('Load fees error:', err);
  }
}

async function generateMonthlyFees() {
  const month = prompt('Enter billing month (YYYY-MM):', new Date().toISOString().slice(0, 7));
  if (!month) return;

  try {
    const res = await ApiClient.post('/api/admin/fees/generate', { month_year: month });
    if (res.success) {
      UI.showToast(res.message, 'success');
      loadFees();
      loadOverview();
    }
  } catch (err) {
    console.error('Generate fees error:', err);
  }
}

function openRecordPaymentModal() {
  document.getElementById('paymentForm').reset();
  UI.openModal('recordPaymentModal');
}

function quickPayInvoice(invoiceId, pendingAmount) {
  openRecordPaymentModal();
  const select = document.getElementById('payInvoiceSelect');
  if (select) select.value = invoiceId;
  const amountInput = document.getElementById('payAmount');
  if (amountInput) amountInput.value = pendingAmount;
}

async function submitRecordPayment() {
  const fee_id = document.getElementById('payInvoiceSelect').value;
  const amount = document.getElementById('payAmount').value;
  const payment_method = document.getElementById('payMethod').value;
  const transaction_ref = document.getElementById('payRef').value.trim();

  if (!fee_id || !amount) {
    UI.showToast('Please select invoice and enter amount.', 'warning');
    return;
  }

  try {
    const res = await ApiClient.post('/api/admin/payments', {
      fee_id,
      amount,
      payment_method,
      transaction_ref
    });

    if (res.success) {
      UI.closeModal('recordPaymentModal');
      UI.showToast('Payment recorded successfully!', 'success');
      loadFees();
      loadOverview();
    }
  } catch (err) {
    console.error('Record payment error:', err);
  }
}

/* ==========================================================================
   11. Expenses Management
   ========================================================================== */
async function loadExpenses() {
  try {
    const res = await ApiClient.get('/api/admin/expenses');
    if (!res.success) return;

    const tbody = document.getElementById('expensesTableBody');
    if (!tbody) return;

    tbody.innerHTML = res.expenses.map(e => `
      <tr>
        <td><strong>${UI.formatDate(e.expense_date)}</strong></td>
        <td><span class="badge badge-active">${e.category}</span></td>
        <td>${UI.escapeHtml(e.title)}</td>
        <td style="color:var(--danger-color); font-weight:700;">-${UI.formatCurrency(e.amount, e.currency)}</td>
        <td>${e.payment_method}</td>
        <td><span style="font-size:0.75rem; color:var(--text-muted);">${e.receipt_ref || '—'}</span></td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="deleteExpense(${e.id})"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Load expenses error:', err);
  }
}

function openAddExpenseModal() {
  document.getElementById('expenseForm').reset();
  UI.openModal('addExpenseModal');
}

async function submitAddExpense() {
  const category = document.getElementById('expCategory').value;
  const title = document.getElementById('expTitle').value.trim();
  const amount = document.getElementById('expAmount').value;
  const expense_date = document.getElementById('expDate').value;

  if (!title || !amount) {
    UI.showToast('Title and amount are required.', 'warning');
    return;
  }

  try {
    const res = await ApiClient.post('/api/admin/expenses', {
      category,
      title,
      amount,
      expense_date
    });

    if (res.success) {
      UI.closeModal('addExpenseModal');
      UI.showToast('Expense logged successfully!', 'success');
      loadExpenses();
      loadOverview();
    }
  } catch (err) {
    console.error('Log expense error:', err);
  }
}

async function deleteExpense(expenseId) {
  if (!confirm('Delete this expense record?')) return;
  try {
    const res = await ApiClient.delete(`/api/admin/expenses/${expenseId}`);
    if (res.success) {
      UI.showToast('Expense removed.', 'info');
      loadExpenses();
      loadOverview();
    }
  } catch (err) {
    console.error('Delete expense error:', err);
  }
}

/* ==========================================================================
   12. Direct Messages
   ========================================================================== */
async function loadMessagesModule() {
  try {
    const res = await ApiClient.get('/api/messages/contacts');
    if (!res.success) return;

    const container = document.getElementById('contactsContainer');
    if (!container) return;

    container.innerHTML = res.contacts.map(c => `
      <div class="chat-contact-item" onclick="openChatThread(${c.id}, '${UI.escapeHtml(c.name)}', '${c.role}')">
        <img src="${c.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}" class="user-avatar-mini" />
        <div style="flex:1; overflow:hidden;">
          <div style="font-weight:700; font-size:0.85rem;">${UI.escapeHtml(c.name)}</div>
          <div style="font-size:0.7rem; color:var(--accent-gold); text-transform:uppercase;">${c.role}</div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Load messages error:', err);
  }
}

async function openChatThread(contactId, name, role) {
  activeChatContactId = contactId;
  document.getElementById('chatContactName').textContent = `${name} (${role.toUpperCase()})`;

  try {
    const res = await ApiClient.get(`/api/messages/thread/${contactId}`);
    if (!res.success) return;

    const messagesArea = document.getElementById('chatMessagesArea');
    if (!messagesArea) return;

    const user = ApiClient.getUser();
    messagesArea.innerHTML = res.thread.map(msg => `
      <div class="chat-bubble ${msg.sender_id === user.id ? 'sent' : 'received'}">
        <div>${UI.escapeHtml(msg.content)}</div>
        <div class="chat-timestamp">${UI.formatTime(msg.sent_at?.slice(11, 16) || '')}</div>
      </div>
    `).join('');

    messagesArea.scrollTop = messagesArea.scrollHeight;
  } catch (err) {
    console.error('Open chat thread error:', err);
  }
}

function handleChatKeyPress(e) {
  if (e.key === 'Enter') {
    sendMessage();
  }
}

async function sendMessage() {
  if (!activeChatContactId) {
    UI.showToast('Please select a conversation first.', 'warning');
    return;
  }

  const input = document.getElementById('chatInput');
  const content = input.value.trim();
  if (!content) return;

  try {
    const res = await ApiClient.post('/api/messages/send', {
      receiver_id: activeChatContactId,
      content
    });

    if (res.success) {
      input.value = '';
      openChatThread(activeChatContactId, document.getElementById('chatContactName').textContent, '');
    }
  } catch (err) {
    console.error('Send message error:', err);
  }
}

/* ==========================================================================
   13. Reports Export
   ========================================================================== */
async function exportReport(type) {
  try {
    let endpoint = `/api/reports/${type}`;
    const res = await ApiClient.get(endpoint);
    if (!res.success) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    if (type === 'students') {
      csvContent += 'ID,Name,Email,Phone,Country,Course,Teacher,Monthly Fee,Status\n';
      res.data.forEach(d => {
        csvContent += `"${d.id}","${d.name}","${d.email}","${d.phone || ''}","${d.country}","${d.course || ''}","${d.teacher || ''}","${d.monthly_fee}","${d.account_status}"\n`;
      });
    } else if (type === 'financial') {
      csvContent += 'Invoice #,Student,Month,Amount,Status\n';
      res.feeInvoices.forEach(f => {
        csvContent += `"${f.invoice_number}","${f.student_name}","${f.month_year}","${f.net_amount}","${f.status}"\n`;
      });
    } else if (type === 'attendance') {
      csvContent += 'Date,Student,Teacher,Class,Status\n';
      res.records.forEach(r => {
        csvContent += `"${r.date}","${r.student_name}","${r.teacher_name}","${r.class_title || ''}","${r.status}"\n`;
      });
    } else if (type === 'quran-progress') {
      csvContent += 'Date,Student,Teacher,Surah,Juz,Reading,Tajweed,Stage\n';
      res.logs.forEach(l => {
        csvContent += `"${l.date}","${l.student_name}","${l.teacher_name}","${l.surah_name}","${l.juz_number || 1}","${l.reading_rating}","${l.tajweed_rating}","${l.revision_status}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `quranora_${type}_report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    UI.showToast(`Exported ${type} report to CSV!`, 'success');
  } catch (err) {
    console.error('Export report error:', err);
  }
}

/* ==========================================================================
   14. Settings & DB Reset
   ========================================================================== */
async function loadSettings() {
  try {
    const res = await ApiClient.get('/api/admin/settings');
    if (!res.success) return;

    const s = res.settings;
    if (s.academy_name) document.getElementById('settingAcademyName').value = s.academy_name;
    if (s.academy_currency) document.getElementById('settingCurrency').value = s.academy_currency;
    if (s.academy_phone) document.getElementById('settingPhone').value = s.academy_phone;
    if (s.zoom_default_link) document.getElementById('settingZoomLink').value = s.zoom_default_link;
    if (s.sibling_discount_pct) document.getElementById('settingSiblingDiscount').value = s.sibling_discount_pct;
    if (s.academy_timezone) document.getElementById('settingTimezone').value = s.academy_timezone;
  } catch (err) {}
}

async function saveSettings() {
  const settings = {
    academy_name: document.getElementById('settingAcademyName').value,
    academy_currency: document.getElementById('settingCurrency').value,
    academy_phone: document.getElementById('settingPhone').value,
    zoom_default_link: document.getElementById('settingZoomLink').value,
    sibling_discount_pct: document.getElementById('settingSiblingDiscount').value,
    academy_timezone: document.getElementById('settingTimezone').value
  };

  try {
    const res = await ApiClient.put('/api/admin/settings', { settings });
    if (res.success) {
      UI.showToast('Settings saved successfully!', 'success');
    }
  } catch (err) {
    console.error('Save settings error:', err);
  }
}

async function resetDatabaseSeed() {
  if (!confirm('WARNING: This will clear all changes and restore full authentic seed data (Teachers, Students, Classes, Attendance, and Invoices). Continue?')) return;
  try {
    const res = await ApiClient.post('/api/admin/system/reset-seed', {});
    if (res.success) {
      UI.showToast('Database reset and re-seeded successfully!', 'success');
      setTimeout(() => window.location.reload(), 800);
    }
  } catch (err) {
    console.error('Reset seed error:', err);
  }
}

/* ==========================================================================
   Dropdowns & Notifications Helpers
   ========================================================================== */
async function loadDropdowns() {
  try {
    const [coursesRes, teachersRes, studentsRes] = await Promise.all([
      ApiClient.get('/api/admin/courses'),
      ApiClient.get('/api/admin/teachers'),
      ApiClient.get('/api/admin/students')
    ]);

    // Populate Course Filters & Modals
    if (coursesRes.success) {
      const courseOptions = coursesRes.courses.map(c => `<option value="${c.id}">${c.title}</option>`).join('');
      ['studentCourseFilter', 'modalAssignCourse', 'addStudCourse', 'addClassCourse'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          if (id.includes('Filter')) el.innerHTML = '<option value="ALL">All Courses</option>' + courseOptions;
          else el.innerHTML = courseOptions;
        }
      });
    }

    // Populate Teacher Filters & Modals
    if (teachersRes.success) {
      const teacherOptions = teachersRes.teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
      ['studentTeacherFilter', 'modalAssignTeacher', 'addStudTeacher', 'addClassTeacher'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          if (id.includes('Filter')) el.innerHTML = '<option value="ALL">All Teachers</option>' + teacherOptions;
          else el.innerHTML = teacherOptions;
        }
      });
    }

    // Populate Student Modals
    if (studentsRes.success) {
      const studentOptions = studentsRes.students.map(s => `<option value="${s.id}">${s.name} (${s.email})</option>`).join('');
      const classStudEl = document.getElementById('addClassStudent');
      if (classStudEl) classStudEl.innerHTML = studentOptions;
    }
  } catch (err) {}
}

async function loadNotifications() {
  try {
    const res = await ApiClient.get('/api/notifications');
    if (!res.success) return;

    const list = document.getElementById('notifList');
    const dot = document.getElementById('notifDot');

    if (dot) dot.style.display = res.unreadCount > 0 ? 'block' : 'none';

    if (list && res.notifications.length > 0) {
      list.innerHTML = res.notifications.map(n => `
        <div style="padding:0.75rem 1rem; border-bottom:1px solid var(--border-color); font-size:0.82rem; ${n.is_read ? 'opacity:0.7;' : 'background:rgba(217,119,6,0.06);'}">
          <div style="font-weight:700; color:var(--text-primary);">${UI.escapeHtml(n.title)}</div>
          <div style="color:var(--text-muted); margin-top:2px;">${UI.escapeHtml(n.message)}</div>
          <div style="font-size:0.7rem; color:var(--accent-gold); margin-top:4px;">${UI.formatDate(n.created_at)}</div>
        </div>
      `).join('');
    }
  } catch (err) {}
}

async function markAllNotificationsRead() {
  try {
    await ApiClient.post('/api/notifications/mark-read', {});
    loadNotifications();
  } catch (err) {}
}

function toggleDropdown(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.toggle('show');
  }
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

// Close dropdowns on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('.dropdown')) {
    document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
  }
});
