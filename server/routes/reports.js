const express = require('express');
const db = require('../db/database');
const { authenticate, requireRoles } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);
router.use(requireRoles('superadmin', 'admin'));

/**
 * GET /api/reports/students
 */
router.get('/students', (req, res) => {
  try {
    const { status, course_id } = req.query;
    let query = `
      SELECT 
        s.id, s.name, s.email, s.age, s.phone, s.country, s.city, s.timezone,
        c.title as course, t.name as teacher, s.monthly_fee, s.currency,
        u.status as account_status, s.registration_date
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN courses c ON s.course_id = c.id
      LEFT JOIN teachers t ON s.teacher_id = t.id
      WHERE 1=1
    `;
    const params = [];
    if (status && status !== 'ALL') {
      query += ` AND u.status = ?`;
      params.push(status);
    }
    if (course_id && course_id !== 'ALL') {
      query += ` AND s.course_id = ?`;
      params.push(course_id);
    }
    query += ` ORDER BY s.id ASC`;

    const data = db.all(query, params);
    res.json({ success: true, title: 'Students Report', generated_at: new Date().toISOString(), count: data.length, data });
  } catch (err) {
    console.error('Students report error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate students report.' });
  }
});

/**
 * GET /api/reports/financial
 * Comprehensive Revenue, Fees, and Expenses Report
 */
router.get('/financial', (req, res) => {
  try {
    const { month } = req.query;
    const targetMonth = month || new Date().toISOString().slice(0, 7);

    const feeInvoices = db.all(`
      SELECT f.*, s.name as student_name, c.title as course_title
      FROM fees f
      JOIN students s ON f.student_id = s.id
      LEFT JOIN courses c ON s.course_id = c.id
      WHERE f.month_year = ?
      ORDER BY f.id ASC
    `, [targetMonth]);

    const payments = db.all(`
      SELECT p.*, s.name as student_name
      FROM payments p
      JOIN students s ON p.student_id = s.id
      WHERE strftime('%Y-%m', p.payment_date) = ?
      ORDER BY p.payment_date ASC
    `, [targetMonth]);

    const expenses = db.all(`
      SELECT * FROM expenses
      WHERE strftime('%Y-%m', expense_date) = ?
      ORDER BY expense_date ASC
    `, [targetMonth]);

    const totalBilled = feeInvoices.reduce((sum, f) => sum + f.net_amount, 0);
    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalPending = feeInvoices.reduce((sum, f) => sum + f.pending_amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalCollected - totalExpenses;

    res.json({
      success: true,
      month: targetMonth,
      generated_at: new Date().toISOString(),
      summary: {
        totalBilled,
        totalCollected,
        totalPending,
        totalExpenses,
        netProfit,
        profitMargin: totalCollected > 0 ? ((netProfit / totalCollected) * 100).toFixed(1) + '%' : '0%'
      },
      feeInvoices,
      payments,
      expenses
    });
  } catch (err) {
    console.error('Financial report error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate financial report.' });
  }
});

/**
 * GET /api/reports/attendance
 */
router.get('/attendance', (req, res) => {
  try {
    const { month, teacher_id } = req.query;
    const targetMonth = month || new Date().toISOString().slice(0, 7);

    let query = `
      SELECT 
        a.*, s.name as student_name, t.name as teacher_name, c.title as class_title
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      JOIN teachers t ON a.teacher_id = t.id
      LEFT JOIN classes c ON a.class_id = c.id
      WHERE strftime('%Y-%m', a.date) = ?
    `;
    const params = [targetMonth];

    if (teacher_id && teacher_id !== 'ALL') {
      query += ` AND a.teacher_id = ?`;
      params.push(parseInt(teacher_id));
    }

    query += ` ORDER BY a.date DESC, a.id DESC`;

    const records = db.all(query, params);

    const stats = {
      total: records.length,
      present: records.filter(r => r.status === 'PRESENT').length,
      absent: records.filter(r => r.status === 'ABSENT').length,
      late: records.filter(r => r.status === 'LATE').length,
      leave: records.filter(r => r.status === 'LEAVE').length
    };
    stats.attendanceRate = stats.total > 0 ? ((stats.present / stats.total) * 100).toFixed(1) + '%' : '0%';

    res.json({
      success: true,
      month: targetMonth,
      stats,
      records
    });
  } catch (err) {
    console.error('Attendance report error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate attendance report.' });
  }
});

/**
 * GET /api/reports/quran-progress
 */
router.get('/quran-progress', (req, res) => {
  try {
    const logs = db.all(`
      SELECT 
        qp.*, s.name as student_name, t.name as teacher_name, c.title as course_title
      FROM quran_progress qp
      JOIN students s ON qp.student_id = s.id
      JOIN teachers t ON qp.teacher_id = t.id
      LEFT JOIN courses c ON s.course_id = c.id
      ORDER BY qp.date DESC, qp.id DESC
      LIMIT 200
    `);

    const hifzSummary = db.all(`
      SELECT hr.*, s.name as student_name, s.country
      FROM hifz_records hr
      JOIN students s ON hr.student_id = s.id
      ORDER BY hr.completion_pct DESC
    `);

    res.json({
      success: true,
      generated_at: new Date().toISOString(),
      totalEntries: logs.length,
      logs,
      hifzSummary
    });
  } catch (err) {
    console.error('Quran progress report error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate Quran progress report.' });
  }
});

module.exports = router;
