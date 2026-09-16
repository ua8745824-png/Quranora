const express = require('express');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { ensureParent } = require('../middleware/isolation');

const router = express.Router();

router.use(authenticate);
router.use(ensureParent);

/**
 * Helper to verify child belongs to parent
 */
function verifyChildBelongsToParent(parentId, studentId) {
  return db.get(`
    SELECT s.*, ps.relationship 
    FROM students s
    JOIN parent_students ps ON s.id = ps.student_id
    WHERE ps.parent_id = ? AND s.id = ?
  `, [parentId, studentId]);
}

/**
 * GET /api/parent/overview
 * Family dashboard with multi-child overview
 */
router.get('/overview', (req, res) => {
  try {
    const parent = req.parent;

    const children = db.all(`
      SELECT 
        s.*, 
        c.title as course_title, 
        t.name as teacher_name, 
        t.zoom_link as teacher_zoom_link,
        ps.relationship
      FROM students s
      JOIN parent_students ps ON s.id = ps.student_id
      LEFT JOIN courses c ON s.course_id = c.id
      LEFT JOIN teachers t ON s.teacher_id = t.id
      WHERE ps.parent_id = ?
    `, [parent.id]);

    // Attach latest progress and attendance rate per child
    children.forEach(child => {
      child.lastProgress = db.get(`
        SELECT * FROM quran_progress WHERE student_id = ? ORDER BY date DESC, id DESC LIMIT 1
      `, [child.id]);

      const att = db.get(`
        SELECT COUNT(*) as total, SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) as presentCount
        FROM attendance WHERE student_id = ?
      `, [child.id]);
      child.attendancePct = att.total > 0 ? Math.round((att.presentCount / att.total) * 100) : 100;

      // Pending homework
      child.pendingHomeworkCount = db.get(`
        SELECT COUNT(*) as count 
        FROM homework h
        LEFT JOIN homework_submissions hs ON h.id = hs.homework_id
        WHERE h.student_id = ? AND hs.id IS NULL
      `, [child.id]).count;
    });

    // Family timetable
    const studentIds = children.map(c => c.id);
    let familyClasses = [];
    if (studentIds.length > 0) {
      const placeholders = studentIds.map(() => '?').join(',');
      familyClasses = db.all(`
        SELECT c.*, co.title as course_title, t.name as teacher_name, s.name as student_name
        FROM classes c
        JOIN courses co ON c.course_id = co.id
        JOIN teachers t ON c.teacher_id = t.id
        JOIN students s ON c.student_id = s.id
        WHERE c.student_id IN (${placeholders}) AND c.status = 'ACTIVE'
        ORDER BY c.start_time ASC
      `, studentIds).map(cl => ({
        ...cl,
        days_of_week: JSON.parse(cl.days_of_week || '[]')
      }));
    }

    // Family Fee Invoices
    let familyFees = [];
    if (studentIds.length > 0) {
      const placeholders = studentIds.map(() => '?').join(',');
      familyFees = db.all(`
        SELECT f.*, s.name as student_name
        FROM fees f
        JOIN students s ON f.student_id = s.id
        WHERE f.student_id IN (${placeholders})
        ORDER BY f.id DESC LIMIT 10
      `, studentIds);
    }

    res.json({
      success: true,
      parent,
      children,
      familyClasses,
      familyFees
    });
  } catch (err) {
    console.error('Parent overview error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch parent dashboard overview.' });
  }
});

/**
 * GET /api/parent/children/:student_id/details
 */
router.get('/children/:student_id/details', (req, res) => {
  try {
    const parent = req.parent;
    const studentId = parseInt(req.params.student_id);

    const child = verifyChildBelongsToParent(parent.id, studentId);
    if (!child) {
      return res.status(403).json({ success: false, message: 'Child is not linked to this parent account.' });
    }

    const course = db.get('SELECT * FROM courses WHERE id = ?', [child.course_id]);
    const teacher = db.get('SELECT id, name, email, phone, bio, zoom_link FROM teachers WHERE id = ?', [child.teacher_id]);
    
    const attendanceHistory = db.all('SELECT * FROM attendance WHERE student_id = ? ORDER BY date DESC LIMIT 30', [studentId]);
    const progressHistory = db.all('SELECT * FROM quran_progress WHERE student_id = ? ORDER BY date DESC, id DESC LIMIT 30', [studentId]);
    const hifzRecord = db.get('SELECT * FROM hifz_records WHERE student_id = ?', [studentId]);
    const homework = db.all(`
      SELECT h.*, hs.grade, hs.teacher_feedback, hs.submitted_at 
      FROM homework h 
      LEFT JOIN homework_submissions hs ON h.id = hs.homework_id 
      WHERE h.student_id = ? 
      ORDER BY h.due_date DESC
    `, [studentId]);
    const fees = db.all('SELECT * FROM fees WHERE student_id = ? ORDER BY id DESC', [studentId]);

    res.json({
      success: true,
      child,
      course,
      teacher,
      attendanceHistory,
      progressHistory,
      hifzRecord,
      homework,
      fees
    });
  } catch (err) {
    console.error('Child details error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch child details.' });
  }
});

/**
 * GET /api/parent/fees
 */
router.get('/fees', (req, res) => {
  try {
    const parent = req.parent;
    const children = db.all('SELECT student_id FROM parent_students WHERE parent_id = ?', [parent.id]);
    const studentIds = children.map(c => c.student_id);

    if (studentIds.length === 0) {
      return res.json({ success: true, invoices: [], payments: [] });
    }

    const placeholders = studentIds.map(() => '?').join(',');
    const invoices = db.all(`
      SELECT f.*, s.name as student_name, c.title as course_title
      FROM fees f
      JOIN students s ON f.student_id = s.id
      LEFT JOIN courses c ON s.course_id = c.id
      WHERE f.student_id IN (${placeholders})
      ORDER BY f.id DESC
    `, studentIds);

    const payments = db.all(`
      SELECT p.*, s.name as student_name
      FROM payments p
      JOIN students s ON p.student_id = s.id
      WHERE p.student_id IN (${placeholders})
      ORDER BY p.payment_date DESC
    `, studentIds);

    res.json({ success: true, invoices, payments });
  } catch (err) {
    console.error('Fetch parent fees error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch family invoices.' });
  }
});

module.exports = router;
