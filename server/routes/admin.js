const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { authenticate, requireRoles } = require('../middleware/auth');
const { seedDatabase } = require('../db/seed');

const router = express.Router();

// Guard all admin routes with authentication & role check
router.use(authenticate);
router.use(requireRoles('superadmin', 'admin'));

/**
 * GET /api/admin/overview
 * Central dashboard KPIs & stats
 */
router.get('/overview', (req, res) => {
  try {
    const totalStudents = db.get('SELECT COUNT(*) as count FROM students').count;
    const activeStudents = db.get("SELECT COUNT(*) as count FROM users WHERE role = 'student' AND status = 'ACTIVE'").count;
    const pendingStudents = db.get("SELECT COUNT(*) as count FROM users WHERE role = 'student' AND status = 'PENDING'").count;
    const suspendedStudents = db.get("SELECT COUNT(*) as count FROM users WHERE role = 'student' AND status = 'SUSPENDED'").count;

    const totalTeachers = db.get('SELECT COUNT(*) as count FROM teachers WHERE is_active = 1').count;

    // Monthly Fees & Financials
    const currentMonth = new Date().toISOString().slice(0, 7); // '2026-09'
    const feeStats = db.get(`
      SELECT 
        COALESCE(SUM(net_amount), 0) as totalBilled,
        COALESCE(SUM(paid_amount), 0) as totalPaid,
        COALESCE(SUM(pending_amount), 0) as totalPending
      FROM fees
      WHERE month_year = ?
    `, [currentMonth]);

    const expenseStats = db.get(`
      SELECT COALESCE(SUM(amount), 0) as totalExpenses
      FROM expenses
      WHERE strftime('%Y-%m', expense_date) = ?
    `, [currentMonth]);

    // Today's classes count
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = days[new Date().getDay()];

    const todayClasses = db.all(`
      SELECT c.*, co.title as course_title, t.name as teacher_name, s.name as student_name
      FROM classes c
      JOIN courses co ON c.course_id = co.id
      JOIN teachers t ON c.teacher_id = t.id
      JOIN students s ON c.student_id = s.id
      WHERE c.status = 'ACTIVE' AND c.days_of_week LIKE ?
      ORDER BY c.start_time ASC
    `, [`%${todayName}%`]);

    // Attendance stats
    const attendanceStats = db.get(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) as presentCount,
        SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END) as absentCount,
        SUM(CASE WHEN status = 'LATE' THEN 1 ELSE 0 END) as lateCount,
        SUM(CASE WHEN status = 'LEAVE' THEN 1 ELSE 0 END) as leaveCount
      FROM attendance
      WHERE strftime('%Y-%m', date) = ?
    `, [currentMonth]);

    // Recent activities / progress updates
    const recentProgress = db.all(`
      SELECT qp.*, s.name as student_name, t.name as teacher_name
      FROM quran_progress qp
      JOIN students s ON qp.student_id = s.id
      JOIN teachers t ON qp.teacher_id = t.id
      ORDER BY qp.date DESC, qp.id DESC
      LIMIT 5
    `);

    // Pending registrations list for quick action
    const pendingList = db.all(`
      SELECT s.*, u.status, u.created_at as registered_at, c.title as course_title
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN courses c ON s.course_id = c.id
      WHERE u.status = 'PENDING'
      ORDER BY u.created_at DESC
    `);

    res.json({
      success: true,
      stats: {
        totalStudents,
        activeStudents,
        pendingStudents,
        suspendedStudents,
        totalTeachers,
        todayClassesCount: todayClasses.length,
        monthlyRevenue: feeStats.totalPaid,
        pendingFees: feeStats.totalPending,
        totalBilled: feeStats.totalBilled,
        monthlyExpenses: expenseStats.totalExpenses,
        netProfit: feeStats.totalPaid - expenseStats.totalExpenses,
        attendanceRate: attendanceStats.total > 0 
          ? Math.round((attendanceStats.presentCount / attendanceStats.total) * 100) 
          : 95
      },
      todayClasses,
      pendingList,
      recentProgress
    });
  } catch (err) {
    console.error('Admin overview error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch admin overview stats.' });
  }
});

/**
 * GET /api/admin/students
 * With search, filter, pagination
 */
router.get('/students', (req, res) => {
  try {
    const { search, status, course, teacher } = req.query;

    let query = `
      SELECT 
        s.*, 
        u.email, 
        u.status as user_status, 
        u.created_at as account_created,
        c.title as course_title,
        t.name as teacher_name,
        p.name as parent_name,
        p.phone as parent_phone
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN courses c ON s.course_id = c.id
      LEFT JOIN teachers t ON s.teacher_id = t.id
      LEFT JOIN parent_students ps ON s.id = ps.student_id
      LEFT JOIN parents p ON ps.parent_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (s.name LIKE ? OR s.email LIKE ? OR s.country LIKE ? OR s.city LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status && status !== 'ALL') {
      query += ` AND u.status = ?`;
      params.push(status);
    }

    if (course && course !== 'ALL') {
      query += ` AND s.course_id = ?`;
      params.push(course);
    }

    if (teacher && teacher !== 'ALL') {
      query += ` AND s.teacher_id = ?`;
      params.push(teacher);
    }

    query += ` ORDER BY s.id DESC`;

    const students = db.all(query, params);
    res.json({ success: true, count: students.length, students });
  } catch (err) {
    console.error('Fetch students error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch students list.' });
  }
});

/**
 * POST /api/admin/students
 * Add new student manually
 */
router.post('/students', (req, res) => {
  try {
    const {
      name,
      email,
      password,
      age,
      phone,
      country,
      city,
      timezone,
      course_id,
      teacher_id,
      monthly_fee,
      currency,
      status,
      notes
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = db.get('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing) {
      return res.status(400).json({ success: false, message: 'User with this email already exists.' });
    }

    const passwordHash = bcrypt.hashSync(password || 'student123', 10);
    const userStatus = status || 'ACTIVE';

    let studentId = null;

    db.transaction(() => {
      const userRes = db.run(`
        INSERT INTO users (email, password_hash, role, status)
        VALUES (?, ?, 'student', ?)
      `, [cleanEmail, passwordHash, userStatus]);

      const studentRes = db.run(`
        INSERT INTO students (user_id, name, email, age, phone, country, city, timezone, course_id, teacher_id, monthly_fee, currency, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userRes.lastInsertRowid,
        name.trim(),
        cleanEmail,
        age ? parseInt(age) : null,
        phone || null,
        country || 'Global',
        city || null,
        timezone || 'UTC',
        course_id || null,
        teacher_id ? parseInt(teacher_id) : null,
        monthly_fee ? parseFloat(monthly_fee) : 50.0,
        currency || 'USD',
        notes || null
      ]);

      studentId = studentRes.lastInsertRowid;
    });

    res.status(201).json({ success: true, message: 'Student created successfully.', studentId });
  } catch (err) {
    console.error('Create student error:', err);
    res.status(500).json({ success: false, message: 'Failed to create student.' });
  }
});

/**
 * PUT /api/admin/students/:id
 */
router.put('/students/:id', (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const {
      name,
      age,
      phone,
      country,
      city,
      timezone,
      course_id,
      teacher_id,
      monthly_fee,
      currency,
      notes
    } = req.body;

    const student = db.get('SELECT * FROM students WHERE id = ?', [studentId]);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    db.run(`
      UPDATE students
      SET name = ?, age = ?, phone = ?, country = ?, city = ?, timezone = ?, course_id = ?, teacher_id = ?, monthly_fee = ?, currency = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      name || student.name,
      age !== undefined ? parseInt(age) : student.age,
      phone !== undefined ? phone : student.phone,
      country || student.country,
      city !== undefined ? city : student.city,
      timezone || student.timezone,
      course_id !== undefined ? course_id : student.course_id,
      teacher_id !== undefined ? (teacher_id ? parseInt(teacher_id) : null) : student.teacher_id,
      monthly_fee !== undefined ? parseFloat(monthly_fee) : student.monthly_fee,
      currency || student.currency,
      notes !== undefined ? notes : student.notes,
      studentId
    ]);

    res.json({ success: true, message: 'Student updated successfully.' });
  } catch (err) {
    console.error('Update student error:', err);
    res.status(500).json({ success: false, message: 'Failed to update student.' });
  }
});

/**
 * POST /api/admin/students/:id/status
 * Change student registration/account status (Approve, Reject, Suspend, Activate)
 */
router.post('/students/:id/status', (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const { status, teacher_id, course_id, monthly_fee } = req.body;

    if (!['ACTIVE', 'PENDING', 'REJECTED', 'SUSPENDED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status provided.' });
    }

    const student = db.get('SELECT * FROM students WHERE id = ?', [studentId]);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    db.transaction(() => {
      // 1. Update user table status
      db.run('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, student.user_id]);

      // 2. If assigning teacher or course at approval time
      if (teacher_id || course_id || monthly_fee) {
        db.run(`
          UPDATE students 
          SET teacher_id = COALESCE(?, teacher_id), 
              course_id = COALESCE(?, course_id),
              monthly_fee = COALESCE(?, monthly_fee),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [
          teacher_id ? parseInt(teacher_id) : null,
          course_id || null,
          monthly_fee ? parseFloat(monthly_fee) : null,
          studentId
        ]);
      }

      // 3. Send notification to student
      let notifTitle = 'Account Status Update';
      let notifMsg = `Your Quranora account status is now: ${status}.`;
      if (status === 'ACTIVE') {
        notifTitle = 'Registration Approved! Welcome to Quranora';
        notifMsg = 'Your admission has been approved by the Administration! You can now view your classes, teacher, and schedule.';
      } else if (status === 'REJECTED') {
        notifTitle = 'Registration Update';
        notifMsg = 'Your application was not approved. Please contact management for inquiries.';
      }

      db.run(`
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (?, ?, ?, 'SUCCESS', '/student')
      `, [student.user_id, notifTitle, notifMsg]);
    });

    res.json({ success: true, message: `Student status updated to ${status}.` });
  } catch (err) {
    console.error('Update student status error:', err);
    res.status(500).json({ success: false, message: 'Failed to update student status.' });
  }
});

/**
 * DELETE /api/admin/students/:id
 */
router.delete('/students/:id', (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const student = db.get('SELECT user_id FROM students WHERE id = ?', [studentId]);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    db.run('DELETE FROM users WHERE id = ?', [student.user_id]);
    res.json({ success: true, message: 'Student and user account removed successfully.' });
  } catch (err) {
    console.error('Delete student error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete student.' });
  }
});

/**
 * GET /api/admin/teachers
 */
router.get('/teachers', (req, res) => {
  try {
    const teachers = db.all(`
      SELECT 
        t.*,
        u.status as user_status,
        (SELECT COUNT(*) FROM students s WHERE s.teacher_id = t.id) as assigned_students_count,
        (SELECT COUNT(*) FROM classes c WHERE c.teacher_id = t.id AND c.status = 'ACTIVE') as active_classes_count
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.id ASC
    `);

    res.json({ success: true, teachers });
  } catch (err) {
    console.error('Fetch teachers error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch teachers.' });
  }
});

/**
 * POST /api/admin/teachers
 */
router.post('/teachers', (req, res) => {
  try {
    const { name, email, password, phone, gender, bio, qualification, hourly_rate, monthly_salary, zoom_link } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = db.get('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already in use.' });
    }

    const passwordHash = bcrypt.hashSync(password || 'teacher123', 10);
    let teacherId = null;

    db.transaction(() => {
      const userRes = db.run(`
        INSERT INTO users (email, password_hash, role, status)
        VALUES (?, ?, 'teacher', 'ACTIVE')
      `, [cleanEmail, passwordHash]);

      const teacherRes = db.run(`
        INSERT INTO teachers (user_id, name, email, phone, gender, bio, qualification, hourly_rate, monthly_salary, zoom_link)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userRes.lastInsertRowid,
        name.trim(),
        cleanEmail,
        phone || null,
        gender || 'male',
        bio || null,
        qualification || null,
        hourly_rate ? parseFloat(hourly_rate) : 18.0,
        monthly_salary ? parseFloat(monthly_salary) : 700.0,
        zoom_link || 'https://meet.google.com/quranora-live-class'
      ]);

      teacherId = teacherRes.lastInsertRowid;
    });

    res.status(201).json({ success: true, message: 'Teacher added successfully.', teacherId });
  } catch (err) {
    console.error('Add teacher error:', err);
    res.status(500).json({ success: false, message: 'Failed to add teacher.' });
  }
});

/**
 * PUT /api/admin/teachers/:id
 */
router.put('/teachers/:id', (req, res) => {
  try {
    const teacherId = parseInt(req.params.id);
    const { name, phone, gender, bio, qualification, hourly_rate, monthly_salary, zoom_link, is_active } = req.body;

    const teacher = db.get('SELECT * FROM teachers WHERE id = ?', [teacherId]);
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found.' });
    }

    db.run(`
      UPDATE teachers
      SET name = ?, phone = ?, gender = ?, bio = ?, qualification = ?, hourly_rate = ?, monthly_salary = ?, zoom_link = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      name || teacher.name,
      phone !== undefined ? phone : teacher.phone,
      gender || teacher.gender,
      bio !== undefined ? bio : teacher.bio,
      qualification !== undefined ? qualification : teacher.qualification,
      hourly_rate !== undefined ? parseFloat(hourly_rate) : teacher.hourly_rate,
      monthly_salary !== undefined ? parseFloat(monthly_salary) : teacher.monthly_salary,
      zoom_link || teacher.zoom_link,
      is_active !== undefined ? (is_active ? 1 : 0) : teacher.is_active,
      teacherId
    ]);

    res.json({ success: true, message: 'Teacher updated successfully.' });
  } catch (err) {
    console.error('Update teacher error:', err);
    res.status(500).json({ success: false, message: 'Failed to update teacher.' });
  }
});

/**
 * GET /api/admin/parents
 */
router.get('/parents', (req, res) => {
  try {
    const parents = db.all(`
      SELECT p.*, u.status as user_status
      FROM parents p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.id ASC
    `);

    parents.forEach(parent => {
      parent.children = db.all(`
        SELECT s.id, s.name, s.age, c.title as course_title, t.name as teacher_name
        FROM students s
        JOIN parent_students ps ON s.id = ps.student_id
        LEFT JOIN courses c ON s.course_id = c.id
        LEFT JOIN teachers t ON s.teacher_id = t.id
        WHERE ps.parent_id = ?
      `, [parent.id]);
    });

    res.json({ success: true, parents });
  } catch (err) {
    console.error('Fetch parents error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch parents.' });
  }
});

/**
 * GET /api/admin/courses
 */
router.get('/courses', (req, res) => {
  try {
    const courses = db.all(`
      SELECT c.*, (SELECT COUNT(*) FROM students s WHERE s.course_id = c.id) as enrolled_students
      FROM courses c
      ORDER BY c.fee_monthly ASC
    `);
    res.json({ success: true, courses });
  } catch (err) {
    console.error('Fetch courses error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch courses.' });
  }
});

/**
 * POST /api/admin/courses
 */
router.post('/courses', (req, res) => {
  try {
    const { id, title, title_ar, description, category, duration_mins, fee_monthly, currency, level, badge, status } = req.body;
    if (!id || !title) {
      return res.status(400).json({ success: false, message: 'Course ID and title are required.' });
    }

    db.run(`
      INSERT INTO courses (id, title, title_ar, description, category, duration_mins, fee_monthly, currency, level, badge, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id.trim().toLowerCase(),
      title.trim(),
      title_ar || null,
      description || null,
      category || 'quran',
      duration_mins ? parseInt(duration_mins) : 30,
      fee_monthly ? parseFloat(fee_monthly) : 50.0,
      currency || 'USD',
      level || 'All Levels',
      badge || null,
      status || 'ACTIVE'
    ]);

    res.status(201).json({ success: true, message: 'Course created successfully.' });
  } catch (err) {
    console.error('Create course error:', err);
    res.status(500).json({ success: false, message: 'Failed to create course.' });
  }
});

/**
 * PUT /api/admin/courses/:id
 */
router.put('/courses/:id', (req, res) => {
  try {
    const courseId = req.params.id;
    const { title, title_ar, description, category, duration_mins, fee_monthly, currency, level, badge, status } = req.body;

    db.run(`
      UPDATE courses
      SET title = ?, title_ar = ?, description = ?, category = ?, duration_mins = ?, fee_monthly = ?, currency = ?, level = ?, badge = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      title,
      title_ar || null,
      description || null,
      category || 'quran',
      duration_mins ? parseInt(duration_mins) : 30,
      fee_monthly ? parseFloat(fee_monthly) : 50.0,
      currency || 'USD',
      level || 'All Levels',
      badge || null,
      status || 'ACTIVE',
      courseId
    ]);

    res.json({ success: true, message: 'Course updated successfully.' });
  } catch (err) {
    console.error('Update course error:', err);
    res.status(500).json({ success: false, message: 'Failed to update course.' });
  }
});

/**
 * GET /api/admin/classes
 */
router.get('/classes', (req, res) => {
  try {
    const classes = db.all(`
      SELECT 
        c.*, 
        co.title as course_title, 
        t.name as teacher_name, 
        s.name as student_name,
        s.country as student_country,
        s.timezone as student_timezone
      FROM classes c
      JOIN courses co ON c.course_id = co.id
      JOIN teachers t ON c.teacher_id = t.id
      JOIN students s ON c.student_id = s.id
      ORDER BY c.start_time ASC
    `);

    // Parse JSON days array
    const parsed = classes.map(cl => ({
      ...cl,
      days_of_week: JSON.parse(cl.days_of_week || '[]')
    }));

    res.json({ success: true, classes: parsed });
  } catch (err) {
    console.error('Fetch classes error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch classes.' });
  }
});

/**
 * POST /api/admin/classes
 */
router.post('/classes', (req, res) => {
  try {
    const { title, course_id, teacher_id, student_id, days_of_week, start_time, end_time, timezone, meeting_link } = req.body;

    if (!course_id || !teacher_id || !student_id || !days_of_week || !start_time || !end_time) {
      return res.status(400).json({ success: false, message: 'Please provide all class details.' });
    }

    const daysJson = Array.isArray(days_of_week) ? JSON.stringify(days_of_week) : days_of_week;

    const teacher = db.get('SELECT zoom_link FROM teachers WHERE id = ?', [teacher_id]);
    const link = meeting_link || (teacher ? teacher.zoom_link : 'https://meet.google.com/quranora-live-class');

    const resClass = db.run(`
      INSERT INTO classes (title, course_id, teacher_id, student_id, days_of_week, start_time, end_time, timezone, meeting_link, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
    `, [
      title || 'Quranora Live Session',
      course_id,
      parseInt(teacher_id),
      parseInt(student_id),
      daysJson,
      start_time,
      end_time,
      timezone || 'UTC',
      link
    ]);

    res.status(201).json({ success: true, message: 'Class scheduled successfully.', classId: resClass.lastInsertRowid });
  } catch (err) {
    console.error('Create class error:', err);
    res.status(500).json({ success: false, message: 'Failed to schedule class.' });
  }
});

/**
 * PUT /api/admin/classes/:id
 */
router.put('/classes/:id', (req, res) => {
  try {
    const classId = parseInt(req.params.id);
    const { title, course_id, teacher_id, student_id, days_of_week, start_time, end_time, timezone, meeting_link, status } = req.body;

    const daysJson = Array.isArray(days_of_week) ? JSON.stringify(days_of_week) : days_of_week;

    db.run(`
      UPDATE classes
      SET title = ?, course_id = ?, teacher_id = ?, student_id = ?, days_of_week = ?, start_time = ?, end_time = ?, timezone = ?, meeting_link = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      title,
      course_id,
      parseInt(teacher_id),
      parseInt(student_id),
      daysJson,
      start_time,
      end_time,
      timezone,
      meeting_link,
      status || 'ACTIVE',
      classId
    ]);

    res.json({ success: true, message: 'Class updated successfully.' });
  } catch (err) {
    console.error('Update class error:', err);
    res.status(500).json({ success: false, message: 'Failed to update class.' });
  }
});

/**
 * DELETE /api/admin/classes/:id
 */
router.delete('/classes/:id', (req, res) => {
  try {
    const classId = parseInt(req.params.id);
    db.run('DELETE FROM classes WHERE id = ?', [classId]);
    res.json({ success: true, message: 'Class removed successfully.' });
  } catch (err) {
    console.error('Delete class error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete class.' });
  }
});

/**
 * GET /api/admin/attendance
 */
router.get('/attendance', (req, res) => {
  try {
    const { date, student_id, teacher_id } = req.query;
    let query = `
      SELECT 
        a.*, 
        s.name as student_name, 
        t.name as teacher_name, 
        c.title as class_title
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      JOIN teachers t ON a.teacher_id = t.id
      LEFT JOIN classes c ON a.class_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (date) {
      query += ` AND a.date = ?`;
      params.push(date);
    }
    if (student_id) {
      query += ` AND a.student_id = ?`;
      params.push(parseInt(student_id));
    }
    if (teacher_id) {
      query += ` AND a.teacher_id = ?`;
      params.push(parseInt(teacher_id));
    }

    query += ` ORDER BY a.date DESC, a.id DESC LIMIT 100`;

    const records = db.all(query, params);
    res.json({ success: true, records });
  } catch (err) {
    console.error('Fetch attendance error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch attendance records.' });
  }
});

/**
 * GET /api/admin/quran-progress
 */
router.get('/quran-progress', (req, res) => {
  try {
    const { student_id } = req.query;
    let query = `
      SELECT 
        qp.*, 
        s.name as student_name, 
        t.name as teacher_name
      FROM quran_progress qp
      JOIN students s ON qp.student_id = s.id
      JOIN teachers t ON qp.teacher_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (student_id) {
      query += ` AND qp.student_id = ?`;
      params.push(parseInt(student_id));
    }

    query += ` ORDER BY qp.date DESC, qp.id DESC LIMIT 100`;

    const logs = db.all(query, params);
    const hifzRecords = db.all(`
      SELECT hr.*, s.name as student_name 
      FROM hifz_records hr
      JOIN students s ON hr.student_id = s.id
    `);

    res.json({ success: true, logs, hifzRecords });
  } catch (err) {
    console.error('Fetch quran progress error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch Quran progress.' });
  }
});

/**
 * GET /api/admin/fees
 */
router.get('/fees', (req, res) => {
  try {
    const { month, status } = req.query;
    let query = `
      SELECT 
        f.*, 
        s.name as student_name, 
        s.email as student_email,
        s.country as student_country,
        c.title as course_title
      FROM fees f
      JOIN students s ON f.student_id = s.id
      LEFT JOIN courses c ON s.course_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (month) {
      query += ` AND f.month_year = ?`;
      params.push(month);
    }
    if (status && status !== 'ALL') {
      query += ` AND f.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY f.id DESC`;

    const invoices = db.all(query, params);
    const payments = db.all(`
      SELECT p.*, s.name as student_name 
      FROM payments p 
      JOIN students s ON p.student_id = s.id 
      ORDER BY p.id DESC LIMIT 50
    `);

    res.json({ success: true, invoices, payments });
  } catch (err) {
    console.error('Fetch fees error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch fees.' });
  }
});

/**
 * POST /api/admin/fees/generate
 * Generate monthly invoices for all active students for given month
 */
router.post('/fees/generate', (req, res) => {
  try {
    const { month_year } = req.body;
    const targetMonth = month_year || new Date().toISOString().slice(0, 7);

    const activeStudents = db.all(`
      SELECT s.* 
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE u.status = 'ACTIVE'
    `);

    let generatedCount = 0;

    db.transaction(() => {
      activeStudents.forEach(student => {
        const existing = db.get('SELECT id FROM fees WHERE student_id = ? AND month_year = ?', [student.id, targetMonth]);
        if (!existing) {
          const invNumber = `INV-${targetMonth}-${String(student.id).padStart(4, '0')}`;
          const gross = student.monthly_fee || 50.0;
          const discount = 0.0;
          const net = gross - discount;
          const dueDate = `${targetMonth}-10`;

          db.run(`
            INSERT INTO fees (invoice_number, student_id, month_year, gross_amount, discount, net_amount, paid_amount, pending_amount, currency, due_date, status, notes)
            VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 'PENDING', ?)
          `, [
            invNumber,
            student.id,
            targetMonth,
            gross,
            discount,
            net,
            net,
            student.currency || 'USD',
            dueDate,
            `Monthly Tuition for ${targetMonth}`
          ]);

          generatedCount++;
        }
      });
    });

    res.json({ success: true, message: `Generated ${generatedCount} invoices for ${targetMonth}.`, generatedCount });
  } catch (err) {
    console.error('Generate fees error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate fees.' });
  }
});

/**
 * POST /api/admin/payments
 * Record a fee payment
 */
router.post('/payments', (req, res) => {
  try {
    const { fee_id, amount, payment_method, transaction_ref, notes } = req.body;

    if (!fee_id || !amount || !payment_method) {
      return res.status(400).json({ success: false, message: 'Fee ID, amount, and payment method required.' });
    }

    const fee = db.get('SELECT * FROM fees WHERE id = ?', [parseInt(fee_id)]);
    if (!fee) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    const payAmount = parseFloat(amount);
    const newPaid = fee.paid_amount + payAmount;
    const newPending = Math.max(0, fee.net_amount - newPaid);
    const newStatus = newPending <= 0 ? 'PAID' : 'PARTIALLY_PAID';

    db.transaction(() => {
      // 1. Insert payment record
      db.run(`
        INSERT INTO payments (fee_id, student_id, amount, currency, payment_method, transaction_ref, payment_date, notes)
        VALUES (?, ?, ?, ?, ?, ?, DATE('now'), ?)
      `, [
        fee.id,
        fee.student_id,
        payAmount,
        fee.currency,
        payment_method,
        transaction_ref || `TXN-${Date.now()}`,
        notes || null
      ]);

      // 2. Update fee invoice
      db.run(`
        UPDATE fees
        SET paid_amount = ?, pending_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [newPaid, newPending, newStatus, fee.id]);

      // 3. Notify student
      const student = db.get('SELECT user_id FROM students WHERE id = ?', [fee.student_id]);
      if (student) {
        db.run(`
          INSERT INTO notifications (user_id, title, message, type, link)
          VALUES (?, 'Payment Received', ?, 'FEE', '/student#fees')
        `, [student.user_id, `Payment of ${fee.currency} ${payAmount} received for invoice ${fee.invoice_number}.`]);
      }
    });

    res.status(201).json({ success: true, message: 'Payment recorded successfully.' });
  } catch (err) {
    console.error('Record payment error:', err);
    res.status(500).json({ success: false, message: 'Failed to record payment.' });
  }
});

/**
 * GET /api/admin/expenses
 */
router.get('/expenses', (req, res) => {
  try {
    const expenses = db.all(`
      SELECT e.*, u.email as creator_email 
      FROM expenses e 
      LEFT JOIN users u ON e.created_by = u.id 
      ORDER BY e.expense_date DESC, e.id DESC
    `);
    res.json({ success: true, expenses });
  } catch (err) {
    console.error('Fetch expenses error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch expenses.' });
  }
});

/**
 * POST /api/admin/expenses
 */
router.post('/expenses', (req, res) => {
  try {
    const { category, title, amount, currency, expense_date, payment_method, notes } = req.body;

    if (!category || !title || !amount) {
      return res.status(400).json({ success: false, message: 'Category, title, and amount required.' });
    }

    db.run(`
      INSERT INTO expenses (category, title, amount, currency, expense_date, payment_method, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      category,
      title.trim(),
      parseFloat(amount),
      currency || 'USD',
      expense_date || new Date().toISOString().slice(0, 10),
      payment_method || 'BANK_TRANSFER',
      notes || null,
      req.user.id
    ]);

    res.status(201).json({ success: true, message: 'Expense logged successfully.' });
  } catch (err) {
    console.error('Log expense error:', err);
    res.status(500).json({ success: false, message: 'Failed to log expense.' });
  }
});

/**
 * DELETE /api/admin/expenses/:id
 */
router.delete('/expenses/:id', (req, res) => {
  try {
    const expenseId = parseInt(req.params.id);
    db.run('DELETE FROM expenses WHERE id = ?', [expenseId]);
    res.json({ success: true, message: 'Expense deleted successfully.' });
  } catch (err) {
    console.error('Delete expense error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete expense.' });
  }
});

/**
 * GET /api/admin/settings
 */
router.get('/settings', (req, res) => {
  try {
    const settingsRows = db.all('SELECT * FROM settings');
    const settings = {};
    settingsRows.forEach(row => {
      settings[row.key] = row.value;
    });
    res.json({ success: true, settings, rows: settingsRows });
  } catch (err) {
    console.error('Fetch settings error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch settings.' });
  }
});

/**
 * PUT /api/admin/settings
 */
router.put('/settings', (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, message: 'Settings object required.' });
    }

    db.transaction(() => {
      for (const [key, value] of Object.entries(settings)) {
        db.run('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)', [key, String(value)]);
      }
    });

    res.json({ success: true, message: 'Settings saved successfully.' });
  } catch (err) {
    console.error('Save settings error:', err);
    res.status(500).json({ success: false, message: 'Failed to save settings.' });
  }
});

/**
 * POST /api/admin/system/reset-seed
 */
router.post('/system/reset-seed', (req, res) => {
  try {
    seedDatabase(true);
    res.json({ success: true, message: 'Database reset and re-seeded with demo data.' });
  } catch (err) {
    console.error('Reset seed error:', err);
    res.status(500).json({ success: false, message: 'Failed to reset seed data.' });
  }
});

module.exports = router;
