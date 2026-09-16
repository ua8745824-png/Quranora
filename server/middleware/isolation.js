const db = require('../db/database');

/**
 * Ensures teacher context is attached and verified
 */
function ensureTeacher(req, res, next) {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Teacher access required.' });
  }

  const teacher = db.get('SELECT * FROM teachers WHERE user_id = ?', [req.user.id]);
  if (!teacher) {
    return res.status(404).json({ success: false, message: 'Teacher profile not found.' });
  }

  req.teacher = teacher;
  next();
}

/**
 * Ensures student context is attached and verified
 */
function ensureStudent(req, res, next) {
  if (req.user.role !== 'student') {
    return res.status(403).json({ success: false, message: 'Student access required.' });
  }

  const student = db.get('SELECT * FROM students WHERE user_id = ?', [req.user.id]);
  if (!student) {
    return res.status(404).json({ success: false, message: 'Student profile not found.' });
  }

  req.student = student;
  next();
}

/**
 * Ensures parent context is attached and verified
 */
function ensureParent(req, res, next) {
  if (req.user.role !== 'parent') {
    return res.status(403).json({ success: false, message: 'Parent access required.' });
  }

  const parent = db.get('SELECT * FROM parents WHERE user_id = ?', [req.user.id]);
  if (!parent) {
    return res.status(404).json({ success: false, message: 'Parent profile not found.' });
  }

  req.parent = parent;
  next();
}

module.exports = {
  ensureTeacher,
  ensureStudent,
  ensureParent
};
