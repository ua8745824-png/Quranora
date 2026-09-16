const express = require('express');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { ensureStudent } = require('../middleware/isolation');

const router = express.Router();

router.use(authenticate);
router.use(ensureStudent);

/**
 * GET /api/student/overview
 */
router.get('/overview', (req, res) => {
  try {
    const student = req.student;

    // Fetch enrolled course
    const course = db.get('SELECT * FROM courses WHERE id = ?', [student.course_id]);

    // Fetch assigned teacher
    const teacher = db.get('SELECT id, name, email, phone, bio, qualification, zoom_link FROM teachers WHERE id = ?', [student.teacher_id]);

    // Next / Today's class
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = days[new Date().getDay()];

    const scheduledClasses = db.all(`
      SELECT c.*, co.title as course_title, t.name as teacher_name, t.zoom_link as teacher_zoom_link
      FROM classes c
      JOIN courses co ON c.course_id = co.id
      JOIN teachers t ON c.teacher_id = t.id
      WHERE c.student_id = ? AND c.status = 'ACTIVE'
      ORDER BY c.start_time ASC
    `, [student.id]).map(cl => ({
      ...cl,
      days_of_week: JSON.parse(cl.days_of_week || '[]')
    }));

    const todayClass = scheduledClasses.find(cl => cl.days_of_week.includes(todayName)) || null;

    // Attendance rate
    const attStats = db.get(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) as presentCount
      FROM attendance
      WHERE student_id = ?
    `, [student.id]);
    const attendancePct = attStats.total > 0 ? Math.round((attStats.presentCount / attStats.total) * 100) : 100;

    // Quran Progress overview
    const lastProgress = db.get(`
      SELECT * FROM quran_progress
      WHERE student_id = ?
      ORDER BY date DESC, id DESC
      LIMIT 1
    `, [student.id]);

    const hifzRecord = db.get('SELECT * FROM hifz_records WHERE student_id = ?', [student.id]);

    // Pending Homework
    const pendingHomework = db.all(`
      SELECT h.* 
      FROM homework h
      LEFT JOIN homework_submissions hs ON h.id = hs.homework_id
      WHERE h.student_id = ? AND hs.id IS NULL
      ORDER BY h.due_date ASC
    `, [student.id]);

    // Current Month Fee Status
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentFee = db.get(`
      SELECT * FROM fees
      WHERE student_id = ? AND month_year = ?
      ORDER BY id DESC LIMIT 1
    `, [student.id, currentMonth]);

    res.json({
      success: true,
      student,
      course,
      teacher,
      todayClass,
      nextClass: scheduledClasses[0] || null,
      scheduledClasses,
      attendanceStats: {
        total: attStats.total,
        presentCount: attStats.presentCount || 0,
        percentage: attendancePct
      },
      lastProgress,
      hifzRecord,
      pendingHomeworkCount: pendingHomework.length,
      pendingHomeworkList: pendingHomework.slice(0, 3),
      currentFee
    });
  } catch (err) {
    console.error('Student overview error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch student dashboard overview.' });
  }
});

/**
 * GET /api/student/classes
 */
router.get('/classes', (req, res) => {
  try {
    const student = req.student;
    const classes = db.all(`
      SELECT c.*, co.title as course_title, t.name as teacher_name, t.zoom_link as teacher_zoom_link
      FROM classes c
      JOIN courses co ON c.course_id = co.id
      JOIN teachers t ON c.teacher_id = t.id
      WHERE c.student_id = ? AND c.status = 'ACTIVE'
      ORDER BY c.start_time ASC
    `, [student.id]).map(cl => ({
      ...cl,
      days_of_week: JSON.parse(cl.days_of_week || '[]')
    }));

    res.json({ success: true, classes });
  } catch (err) {
    console.error('Fetch student classes error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch timetable.' });
  }
});

/**
 * GET /api/student/attendance
 */
router.get('/attendance', (req, res) => {
  try {
    const student = req.student;
    const attendance = db.all(`
      SELECT a.*, t.name as teacher_name
      FROM attendance a
      JOIN teachers t ON a.teacher_id = t.id
      WHERE a.student_id = ?
      ORDER BY a.date DESC
    `, [student.id]);

    res.json({ success: true, attendance });
  } catch (err) {
    console.error('Fetch student attendance error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch attendance history.' });
  }
});

/**
 * GET /api/student/quran-progress
 */
router.get('/quran-progress', (req, res) => {
  try {
    const student = req.student;
    const logs = db.all(`
      SELECT qp.*, t.name as teacher_name
      FROM quran_progress qp
      JOIN teachers t ON qp.teacher_id = t.id
      WHERE qp.student_id = ?
      ORDER BY qp.date DESC, qp.id DESC
    `, [student.id]);

    const hifzRecord = db.get('SELECT * FROM hifz_records WHERE student_id = ?', [student.id]);

    res.json({ success: true, logs, hifzRecord });
  } catch (err) {
    console.error('Fetch student progress error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch Quran progress.' });
  }
});

/**
 * GET /api/student/homework
 */
router.get('/homework', (req, res) => {
  try {
    const student = req.student;
    const homework = db.all(`
      SELECT 
        h.*, 
        t.name as teacher_name,
        hs.id as submission_id,
        hs.submission_text,
        hs.file_url,
        hs.submitted_at,
        hs.grade,
        hs.teacher_feedback,
        hs.graded_at
      FROM homework h
      JOIN teachers t ON h.teacher_id = t.id
      LEFT JOIN homework_submissions hs ON h.id = hs.homework_id
      WHERE h.student_id = ?
      ORDER BY h.due_date DESC, h.id DESC
    `, [student.id]);

    res.json({ success: true, homework });
  } catch (err) {
    console.error('Fetch student homework error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch homework.' });
  }
});

/**
 * POST /api/student/homework/:id/submit
 */
router.post('/homework/:id/submit', (req, res) => {
  try {
    const student = req.student;
    const homeworkId = parseInt(req.params.id);
    const { submission_text, file_url } = req.body;

    if (!submission_text && !file_url) {
      return res.status(400).json({ success: false, message: 'Please provide submission notes or audio/file URL.' });
    }

    const hw = db.get('SELECT * FROM homework WHERE id = ? AND student_id = ?', [homeworkId, student.id]);
    if (!hw) {
      return res.status(404).json({ success: false, message: 'Homework assignment not found.' });
    }

    db.transaction(() => {
      // Upsert submission
      const existing = db.get('SELECT id FROM homework_submissions WHERE homework_id = ?', [homeworkId]);
      if (existing) {
        db.run(`
          UPDATE homework_submissions
          SET submission_text = ?, file_url = ?, submitted_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [submission_text || null, file_url || null, existing.id]);
      } else {
        db.run(`
          INSERT INTO homework_submissions (homework_id, student_id, submission_text, file_url)
          VALUES (?, ?, ?, ?)
        `, [homeworkId, student.id, submission_text || null, file_url || null]);
      }

      db.run("UPDATE homework SET status = 'SUBMITTED' WHERE id = ?", [homeworkId]);

      // Notify teacher
      const teacher = db.get('SELECT user_id FROM teachers WHERE id = ?', [hw.teacher_id]);
      if (teacher) {
        db.run(`
          INSERT INTO notifications (user_id, title, message, type, link)
          VALUES (?, 'Homework Submitted', ?, 'HOMEWORK', '/teacher#homework')
        `, [teacher.user_id, `${student.name} submitted assignment: "${hw.title}".`]);
      }
    });

    res.json({ success: true, message: 'Homework submitted successfully!' });
  } catch (err) {
    console.error('Submit homework error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit homework.' });
  }
});

/**
 * GET /api/student/fees
 */
router.get('/fees', (req, res) => {
  try {
    const student = req.student;
    const invoices = db.all(`
      SELECT f.*, c.title as course_title
      FROM fees f
      LEFT JOIN courses c ON f.student_id = ? AND c.id = (SELECT course_id FROM students WHERE id = ?)
      WHERE f.student_id = ?
      ORDER BY f.id DESC
    `, [student.id, student.id, student.id]);

    const payments = db.all(`
      SELECT * FROM payments WHERE student_id = ? ORDER BY payment_date DESC
    `, [student.id]);

    res.json({ success: true, invoices, payments });
  } catch (err) {
    console.error('Fetch student fees error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch fee invoices.' });
  }
});

/**
 * GET /api/student/resources
 * Curated Quran and Islamic study resources
 */
router.get('/resources', (req, res) => {
  res.json({
    success: true,
    resources: [
      {
        id: 'noorani-qaida',
        title: 'Complete Color-Coded Noorani Qaida (PDF)',
        category: 'Foundation',
        format: 'PDF / Interactive',
        description: 'Standard Madani Noorani Qaida with clear Arabic articulation guides and letter connections.',
        downloadUrl: 'https://quranora.com/resources/noorani_qaida_color.pdf'
      },
      {
        id: 'tajweed-handbook',
        title: 'Quranora Classical Tajweed Rules Guide',
        category: 'Tajweed',
        format: 'PDF Guide',
        description: 'Makharij charts, Noon & Meem Sakinah rules, Madd classifications with visual diagrams.',
        downloadUrl: 'https://quranora.com/resources/quranora_tajweed_guide.pdf'
      },
      {
        id: 'masnoon-duas',
        title: 'Daily Masnoon Duas & Daily Adhkar Book',
        category: 'Islamic Studies',
        format: 'PDF & Audio',
        description: 'Morning and evening protective Duas with Arabic text, transliteration, and English translation.',
        downloadUrl: 'https://quranora.com/resources/daily_adhkar.pdf'
      },
      {
        id: 'namaz-sunnah',
        title: 'Illustrated Step-by-Step Salah Guide',
        category: 'Namaz',
        format: 'Guide',
        description: 'Complete Sunnah method of Wudu, Takbeer, Ruku, Sujood, and Tashahhud.',
        downloadUrl: 'https://quranora.com/resources/salah_guide.pdf'
      }
    ]
  });
});

module.exports = router;
