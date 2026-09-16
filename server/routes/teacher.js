const express = require('express');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { ensureTeacher } = require('../middleware/isolation');

const router = express.Router();

router.use(authenticate);
router.use(ensureTeacher);

/**
 * GET /api/teacher/overview
 */
router.get('/overview', (req, res) => {
  try {
    const teacherId = req.teacher.id;

    // Assigned students count
    const myStudentsCount = db.get('SELECT COUNT(*) as count FROM students WHERE teacher_id = ?', [teacherId]).count;

    // Today's classes
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = days[new Date().getDay()];

    const todayClasses = db.all(`
      SELECT c.*, co.title as course_title, s.name as student_name, s.timezone as student_timezone
      FROM classes c
      JOIN courses co ON c.course_id = co.id
      JOIN students s ON c.student_id = s.id
      WHERE c.teacher_id = ? AND c.status = 'ACTIVE' AND c.days_of_week LIKE ?
      ORDER BY c.start_time ASC
    `, [teacherId, `%${todayName}%`]);

    // Upcoming classes
    const upcomingClasses = db.all(`
      SELECT c.*, co.title as course_title, s.name as student_name
      FROM classes c
      JOIN courses co ON c.course_id = co.id
      JOIN students s ON c.student_id = s.id
      WHERE c.teacher_id = ? AND c.status = 'ACTIVE'
      ORDER BY c.start_time ASC
      LIMIT 10
    `, [teacherId]).map(cl => ({
      ...cl,
      days_of_week: JSON.parse(cl.days_of_week || '[]')
    }));

    // Recent progress logs recorded by this teacher
    const recentProgress = db.all(`
      SELECT qp.*, s.name as student_name
      FROM quran_progress qp
      JOIN students s ON qp.student_id = s.id
      WHERE qp.teacher_id = ?
      ORDER BY qp.date DESC, qp.id DESC
      LIMIT 5
    `, [teacherId]);

    // Pending homework submissions awaiting grading
    const pendingSubmissions = db.all(`
      SELECT hs.*, h.title as homework_title, s.name as student_name
      FROM homework_submissions hs
      JOIN homework h ON hs.homework_id = h.id
      JOIN students s ON hs.student_id = s.id
      WHERE h.teacher_id = ? AND hs.grade IS NULL
      ORDER BY hs.submitted_at DESC
    `, [teacherId]);

    res.json({
      success: true,
      teacher: req.teacher,
      stats: {
        myStudentsCount,
        todayClassesCount: todayClasses.length,
        pendingGradingCount: pendingSubmissions.length
      },
      todayClasses,
      upcomingClasses,
      recentProgress,
      pendingSubmissions
    });
  } catch (err) {
    console.error('Teacher overview error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch teacher dashboard overview.' });
  }
});

/**
 * GET /api/teacher/students
 * Strict isolation: Only students assigned to this teacher
 */
router.get('/students', (req, res) => {
  try {
    const teacherId = req.teacher.id;

    const students = db.all(`
      SELECT 
        s.*, 
        c.title as course_title,
        (SELECT COUNT(*) FROM attendance a WHERE a.student_id = s.id AND a.status = 'PRESENT') as present_classes,
        (SELECT COUNT(*) FROM attendance a WHERE a.student_id = s.id) as total_classes,
        (SELECT qp.surah_name || ' (Ayah ' || qp.ayah_to || ')' FROM quran_progress qp WHERE qp.student_id = s.id ORDER BY qp.date DESC, qp.id DESC LIMIT 1) as last_lesson
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN courses c ON s.course_id = c.id
      WHERE s.teacher_id = ? AND u.status = 'ACTIVE'
      ORDER BY s.name ASC
    `, [teacherId]);

    res.json({ success: true, count: students.length, students });
  } catch (err) {
    console.error('Fetch teacher students error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch assigned students.' });
  }
});

/**
 * GET /api/teacher/students/:id
 */
router.get('/students/:id', (req, res) => {
  try {
    const teacherId = req.teacher.id;
    const studentId = parseInt(req.params.id);

    const student = db.get(`
      SELECT s.*, c.title as course_title
      FROM students s
      LEFT JOIN courses c ON s.course_id = c.id
      WHERE s.id = ? AND s.teacher_id = ?
    `, [studentId, teacherId]);

    if (!student) {
      return res.status(403).json({ success: false, message: 'Student is not assigned to you or does not exist.' });
    }

    const attendanceHistory = db.all(`
      SELECT * FROM attendance WHERE student_id = ? ORDER BY date DESC LIMIT 30
    `, [studentId]);

    const progressHistory = db.all(`
      SELECT * FROM quran_progress WHERE student_id = ? ORDER BY date DESC, id DESC LIMIT 30
    `, [studentId]);

    const hifzRecord = db.get('SELECT * FROM hifz_records WHERE student_id = ?', [studentId]);

    const homeworkList = db.all(`
      SELECT h.*, hs.grade, hs.teacher_feedback, hs.submitted_at, hs.submission_text, hs.file_url
      FROM homework h
      LEFT JOIN homework_submissions hs ON h.id = hs.homework_id
      WHERE h.student_id = ?
      ORDER BY h.due_date DESC
    `, [studentId]);

    const notes = db.all(`
      SELECT * FROM student_notes WHERE student_id = ? AND teacher_id = ? ORDER BY is_pinned DESC, id DESC
    `, [studentId, teacherId]);

    res.json({
      success: true,
      student,
      attendanceHistory,
      progressHistory,
      hifzRecord,
      homeworkList,
      notes
    });
  } catch (err) {
    console.error('Fetch student details error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch student details.' });
  }
});

/**
 * GET /api/teacher/classes
 */
router.get('/classes', (req, res) => {
  try {
    const teacherId = req.teacher.id;
    const classes = db.all(`
      SELECT c.*, co.title as course_title, s.name as student_name, s.timezone as student_timezone, s.country as student_country
      FROM classes c
      JOIN courses co ON c.course_id = co.id
      JOIN students s ON c.student_id = s.id
      WHERE c.teacher_id = ? AND c.status = 'ACTIVE'
      ORDER BY c.start_time ASC
    `, [teacherId]);

    const parsed = classes.map(cl => ({
      ...cl,
      days_of_week: JSON.parse(cl.days_of_week || '[]')
    }));

    res.json({ success: true, classes: parsed });
  } catch (err) {
    console.error('Fetch teacher classes error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch timetable.' });
  }
});

/**
 * POST /api/teacher/attendance
 */
router.post('/attendance', (req, res) => {
  try {
    const teacherId = req.teacher.id;
    const { student_id, class_id, date, status, teacher_notes } = req.body;

    if (!student_id || !date || !status) {
      return res.status(400).json({ success: false, message: 'Student ID, date, and attendance status required.' });
    }

    // Verify student belongs to this teacher
    const student = db.get('SELECT id FROM students WHERE id = ? AND teacher_id = ?', [parseInt(student_id), teacherId]);
    if (!student) {
      return res.status(403).json({ success: false, message: 'Cannot mark attendance for a student not assigned to you.' });
    }

    db.run(`
      INSERT OR REPLACE INTO attendance (class_id, student_id, teacher_id, date, status, teacher_notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      class_id ? parseInt(class_id) : null,
      parseInt(student_id),
      teacherId,
      date,
      status,
      teacher_notes || null
    ]);

    res.json({ success: true, message: `Attendance marked as ${status}.` });
  } catch (err) {
    console.error('Mark attendance error:', err);
    res.status(500).json({ success: false, message: 'Failed to mark attendance.' });
  }
});

/**
 * POST /api/teacher/quran-progress
 * Specialized Quran Academy progress recording
 */
router.post('/quran-progress', (req, res) => {
  try {
    const teacherId = req.teacher.id;
    const {
      student_id,
      date,
      surah_number,
      surah_name,
      juz_number,
      ayah_from,
      ayah_to,
      reading_rating,
      tajweed_rating,
      memorization_rating,
      revision_status,
      mistakes_count,
      teacher_notes,
      hifz_daily_lines,
      hifz_completed_juz
    } = req.body;

    if (!student_id || !date || !surah_name) {
      return res.status(400).json({ success: false, message: 'Student ID, date, and Surah name are required.' });
    }

    // Verify student assigned to teacher
    const student = db.get('SELECT id, user_id FROM students WHERE id = ? AND teacher_id = ?', [parseInt(student_id), teacherId]);
    if (!student) {
      return res.status(403).json({ success: false, message: 'You can only record progress for your assigned students.' });
    }

    db.transaction(() => {
      // 1. Insert progress entry
      db.run(`
        INSERT INTO quran_progress (student_id, teacher_id, date, surah_number, surah_name, juz_number, ayah_from, ayah_to, reading_rating, tajweed_rating, memorization_rating, revision_status, mistakes_count, teacher_notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        student.id,
        teacherId,
        date,
        surah_number ? parseInt(surah_number) : null,
        surah_name,
        juz_number ? parseInt(juz_number) : null,
        ayah_from ? parseInt(ayah_from) : null,
        ayah_to ? parseInt(ayah_to) : null,
        reading_rating || 'GOOD',
        tajweed_rating || 'GOOD',
        memorization_rating || 'GOOD',
        revision_status || 'SABAQ',
        mistakes_count ? parseInt(mistakes_count) : 0,
        teacher_notes || null
      ]);

      // 2. Update Hifz record if applicable
      if (hifz_completed_juz !== undefined || hifz_daily_lines !== undefined) {
        db.run(`
          INSERT INTO hifz_records (student_id, current_juz, current_surah, total_memorized_juz, completion_pct, updated_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(student_id) DO UPDATE SET
            current_juz = COALESCE(?, current_juz),
            current_surah = COALESCE(?, current_surah),
            total_memorized_juz = COALESCE(?, total_memorized_juz),
            completion_pct = COALESCE(?, completion_pct),
            updated_at = CURRENT_TIMESTAMP
        `, [
          student.id,
          juz_number || 1,
          surah_number || 1,
          parseFloat(hifz_completed_juz || 0),
          ((parseFloat(hifz_completed_juz || 0) / 30) * 100).toFixed(1),
          juz_number || null,
          surah_number || null,
          hifz_completed_juz !== undefined ? parseFloat(hifz_completed_juz) : null,
          hifz_completed_juz !== undefined ? ((parseFloat(hifz_completed_juz) / 30) * 100).toFixed(1) : null
        ]);
      }

      // 3. Notify student
      db.run(`
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (?, 'New Quran Progress Recorded', ?, 'SUCCESS', '/student#progress')
      `, [
        student.user_id,
        `Lesson updated: Surah ${surah_name} (Ayahs ${ayah_from || 1}-${ayah_to || 'end'}). Evaluation: ${tajweed_rating || 'Good'}`
      ]);
    });

    res.status(201).json({ success: true, message: 'Quran progress recorded successfully.' });
  } catch (err) {
    console.error('Record progress error:', err);
    res.status(500).json({ success: false, message: 'Failed to record Quran progress.' });
  }
});

/**
 * GET /api/teacher/homework
 */
router.get('/homework', (req, res) => {
  try {
    const teacherId = req.teacher.id;

    const homeworkList = db.all(`
      SELECT 
        h.*, 
        s.name as student_name, 
        c.title as class_title,
        hs.id as submission_id,
        hs.submission_text,
        hs.file_url,
        hs.submitted_at,
        hs.grade,
        hs.teacher_feedback,
        hs.graded_at
      FROM homework h
      JOIN students s ON h.student_id = s.id
      LEFT JOIN classes c ON h.class_id = c.id
      LEFT JOIN homework_submissions hs ON h.id = hs.homework_id
      WHERE h.teacher_id = ?
      ORDER BY h.due_date DESC, h.id DESC
    `, [teacherId]);

    res.json({ success: true, homework: homeworkList });
  } catch (err) {
    console.error('Fetch homework error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch homework.' });
  }
});

/**
 * POST /api/teacher/homework
 */
router.post('/homework', (req, res) => {
  try {
    const teacherId = req.teacher.id;
    const { student_id, class_id, title, description, due_date, attachment_url } = req.body;

    if (!student_id || !title || !description || !due_date) {
      return res.status(400).json({ success: false, message: 'Please provide all homework details.' });
    }

    const student = db.get('SELECT id, user_id FROM students WHERE id = ? AND teacher_id = ?', [parseInt(student_id), teacherId]);
    if (!student) {
      return res.status(403).json({ success: false, message: 'Can only assign homework to your assigned students.' });
    }

    let hwId = null;
    db.transaction(() => {
      const resHw = db.run(`
        INSERT INTO homework (class_id, teacher_id, student_id, title, description, due_date, attachment_url, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
      `, [
        class_id ? parseInt(class_id) : null,
        teacherId,
        student.id,
        title.trim(),
        description.trim(),
        due_date,
        attachment_url || null
      ]);

      hwId = resHw.lastInsertRowid;

      // Notify student
      db.run(`
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (?, 'New Homework Assigned', ?, 'HOMEWORK', '/student#homework')
      `, [student.user_id, `New assignment: "${title}". Due date: ${due_date}.`]);
    });

    res.status(201).json({ success: true, message: 'Homework created successfully.', homeworkId: hwId });
  } catch (err) {
    console.error('Create homework error:', err);
    res.status(500).json({ success: false, message: 'Failed to create homework.' });
  }
});

/**
 * POST /api/teacher/homework/:id/grade
 */
router.post('/homework/:id/grade', (req, res) => {
  try {
    const teacherId = req.teacher.id;
    const homeworkId = parseInt(req.params.id);
    const { grade, teacher_feedback } = req.body;

    const hw = db.get('SELECT * FROM homework WHERE id = ? AND teacher_id = ?', [homeworkId, teacherId]);
    if (!hw) {
      return res.status(404).json({ success: false, message: 'Homework not found or not created by you.' });
    }

    const submission = db.get('SELECT * FROM homework_submissions WHERE homework_id = ?', [homeworkId]);
    if (!submission) {
      return res.status(400).json({ success: false, message: 'No student submission found to grade.' });
    }

    db.transaction(() => {
      db.run(`
        UPDATE homework_submissions
        SET grade = ?, teacher_feedback = ?, graded_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [grade || 'A', teacher_feedback || 'Well done!', submission.id]);

      db.run("UPDATE homework SET status = 'GRADED' WHERE id = ?", [homeworkId]);

      // Notify student
      const student = db.get('SELECT user_id FROM students WHERE id = ?', [hw.student_id]);
      if (student) {
        db.run(`
          INSERT INTO notifications (user_id, title, message, type, link)
          VALUES (?, 'Homework Graded', ?, 'HOMEWORK', '/student#homework')
        `, [student.user_id, `Your assignment "${hw.title}" has been graded: ${grade}.`]);
      }
    });

    res.json({ success: true, message: 'Homework submission graded successfully.' });
  } catch (err) {
    console.error('Grade homework error:', err);
    res.status(500).json({ success: false, message: 'Failed to grade submission.' });
  }
});

/**
 * POST /api/teacher/notes
 */
router.post('/notes', (req, res) => {
  try {
    const teacherId = req.teacher.id;
    const { student_id, title, note_content, is_pinned } = req.body;

    if (!student_id || !title || !note_content) {
      return res.status(400).json({ success: false, message: 'Student ID, title, and note content are required.' });
    }

    db.run(`
      INSERT INTO student_notes (student_id, teacher_id, title, note_content, is_pinned)
      VALUES (?, ?, ?, ?, ?)
    `, [
      parseInt(student_id),
      teacherId,
      title.trim(),
      note_content.trim(),
      is_pinned ? 1 : 0
    ]);

    res.status(201).json({ success: true, message: 'Teacher diary note saved.' });
  } catch (err) {
    console.error('Save note error:', err);
    res.status(500).json({ success: false, message: 'Failed to save note.' });
  }
});

/**
 * PUT /api/teacher/profile
 */
router.put('/profile', (req, res) => {
  try {
    const teacherId = req.teacher.id;
    const { name, phone, bio, zoom_link } = req.body;

    db.run(`
      UPDATE teachers
      SET name = COALESCE(?, name),
          phone = COALESCE(?, phone),
          bio = COALESCE(?, bio),
          zoom_link = COALESCE(?, zoom_link),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [name, phone, bio, zoom_link, teacherId]);

    res.json({ success: true, message: 'Teacher profile updated successfully.' });
  } catch (err) {
    console.error('Update teacher profile error:', err);
    res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
});

module.exports = router;
