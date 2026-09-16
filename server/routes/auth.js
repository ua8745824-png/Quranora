const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { signToken, authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * Helper to get role profile
 */
function getUserProfile(userId, role) {
  if (role === 'teacher') {
    return db.get('SELECT * FROM teachers WHERE user_id = ?', [userId]);
  }
  if (role === 'student') {
    return db.get(`
      SELECT s.*, c.title as course_title, t.name as teacher_name, t.zoom_link
      FROM students s
      LEFT JOIN courses c ON s.course_id = c.id
      LEFT JOIN teachers t ON s.teacher_id = t.id
      WHERE s.user_id = ?
    `, [userId]);
  }
  if (role === 'parent') {
    const parent = db.get('SELECT * FROM parents WHERE user_id = ?', [userId]);
    if (parent) {
      parent.children = db.all(`
        SELECT s.*, c.title as course_title, t.name as teacher_name, t.zoom_link
        FROM students s
        JOIN parent_students ps ON s.id = ps.student_id
        LEFT JOIN courses c ON s.course_id = c.id
        LEFT JOIN teachers t ON s.teacher_id = t.id
        WHERE ps.parent_id = ?
      `, [parent.id]);
    }
    return parent;
  }
  return null;
}

/**
 * POST /api/auth/login
 */
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    const user = db.get('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    if (user.status === 'PENDING') {
      return res.status(403).json({
        success: false,
        status: 'PENDING',
        message: 'Your registration is currently PENDING Admin approval. Once approved, you will be able to access your dashboard.'
      });
    }

    if (user.status === 'REJECTED') {
      return res.status(403).json({
        success: false,
        status: 'REJECTED',
        message: 'Your application was not approved. Please contact Quranora Administration at syedumarali37406@gmail.com.'
      });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        status: 'SUSPENDED',
        message: 'Your account is currently suspended. Please contact Academy Admin.'
      });
    }

    const token = signToken(user);
    const profile = getUserProfile(user.id, user.role);

    // Role-based target dashboard redirect
    let redirectUrl = '/admin';
    if (user.role === 'teacher') redirectUrl = '/teacher';
    else if (user.role === 'student') redirectUrl = '/student';
    else if (user.role === 'parent') redirectUrl = '/parent';

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      redirectUrl,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        avatar: user.avatar
      },
      profile
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

/**
 * POST /api/auth/register
 * Public registration -> sets status = PENDING
 */
router.post('/register', (req, res) => {
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
      notes
    } = req.body;

    if (!name || !email || !password || !country || !course_id) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields (Name, Email, Password, Country, Course).'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = db.get('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists. Please login instead.'
      });
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    let newStudentId = null;

    db.transaction(() => {
      // 1. Create User in PENDING status
      const userRes = db.run(`
        INSERT INTO users (email, password_hash, role, status)
        VALUES (?, ?, 'student', 'PENDING')
      `, [cleanEmail, passwordHash]);

      const userId = userRes.lastInsertRowid;

      // 2. Fetch course default fee
      const course = db.get('SELECT fee_monthly, currency FROM courses WHERE id = ?', [course_id]);
      const monthlyFee = course ? course.fee_monthly : 50.0;
      const currency = course ? course.currency : 'USD';

      // 3. Create Student profile
      const studentRes = db.run(`
        INSERT INTO students (user_id, name, email, age, phone, country, city, timezone, course_id, monthly_fee, currency, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId,
        name.trim(),
        cleanEmail,
        age ? parseInt(age) : null,
        phone ? phone.trim() : null,
        country.trim(),
        city ? city.trim() : null,
        timezone || 'UTC',
        course_id,
        monthlyFee,
        currency,
        notes ? notes.trim() : null
      ]);

      newStudentId = studentRes.lastInsertRowid;

      // 4. Create Notification for Admin
      const admins = db.all("SELECT id FROM users WHERE role IN ('superadmin', 'admin')");
      admins.forEach(admin => {
        db.run(`
          INSERT INTO notifications (user_id, title, message, type, link)
          VALUES (?, 'New Student Registration Pending', ?, 'ALERT', '/admin#students')
        `, [admin.id, `${name.trim()} has registered for ${course_id} and is awaiting admin approval.`]);
      });
    });

    res.status(201).json({
      success: true,
      status: 'PENDING',
      message: 'Registration submitted successfully! Your account is currently PENDING Admin approval. Once approved, you will be notified to access the Student Portal.'
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', authenticate, (req, res) => {
  try {
    const profile = getUserProfile(req.user.id, req.user.role);
    res.json({
      success: true,
      user: req.user,
      profile
    });
  } catch (err) {
    console.error('Me endpoint error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching user session.' });
  }
});

/**
 * POST /api/auth/demo-switch
 * Instant demo switch helper for testing all 5 roles
 */
router.post('/demo-switch', (req, res) => {
  try {
    const { demoKey } = req.body;
    let targetEmail = 'admin@quranora.com';

    switch (demoKey) {
      case 'superadmin':
      case 'admin':
        targetEmail = 'admin@quranora.com';
        break;
      case 'staff':
        targetEmail = 'staff@quranora.com';
        break;
      case 'teacher-umar':
      case 'teacher':
        targetEmail = 'teacher.umar@quranora.com';
        break;
      case 'teacher-mueez':
        targetEmail = 'teacher.mueez@quranora.com';
        break;
      case 'student-ahmed':
      case 'student':
        targetEmail = 'student.ahmed@gmail.com';
        break;
      case 'student-zayd':
        targetEmail = 'student.zayd@gmail.com';
        break;
      case 'parent-fatima':
      case 'parent':
        targetEmail = 'parent.fatima@gmail.com';
        break;
      case 'pending-bilal':
        targetEmail = 'pending.bilal@gmail.com';
        break;
      default:
        targetEmail = 'admin@quranora.com';
    }

    const user = db.get('SELECT * FROM users WHERE email = ?', [targetEmail]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Demo user not found. Please re-seed database.' });
    }

    if (user.status === 'PENDING') {
      return res.status(403).json({
        success: false,
        status: 'PENDING',
        message: 'This account is PENDING approval. An Admin must approve it before login.'
      });
    }

    const token = signToken(user);
    const profile = getUserProfile(user.id, user.role);

    let redirectUrl = '/admin';
    if (user.role === 'teacher') redirectUrl = '/teacher';
    else if (user.role === 'student') redirectUrl = '/student';
    else if (user.role === 'parent') redirectUrl = '/parent';

    res.json({
      success: true,
      token,
      redirectUrl,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        avatar: user.avatar
      },
      profile
    });
  } catch (err) {
    console.error('Demo switch error:', err);
    res.status(500).json({ success: false, message: 'Server error during demo switch.' });
  }
});

module.exports = router;
