const express = require('express');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

/**
 * GET /api/messages/contacts
 * Returns list of eligible messaging contacts based on role
 */
router.get('/contacts', (req, res) => {
  try {
    const currentUserId = req.user.id;
    const role = req.user.role;
    let contacts = [];

    if (role === 'superadmin' || role === 'admin') {
      // Admin can message any user
      contacts = db.all(`
        SELECT 
          u.id, 
          u.email, 
          u.role, 
          u.avatar,
          COALESCE(t.name, s.name, p.name, u.email) as name
        FROM users u
        LEFT JOIN teachers t ON u.id = t.user_id
        LEFT JOIN students s ON u.id = s.user_id
        LEFT JOIN parents p ON u.id = p.user_id
        WHERE u.id != ? AND u.status = 'ACTIVE'
        ORDER BY u.role, name ASC
      `, [currentUserId]);
    } else if (role === 'teacher') {
      const teacher = db.get('SELECT id FROM teachers WHERE user_id = ?', [currentUserId]);
      const teacherId = teacher ? teacher.id : 0;

      contacts = db.all(`
        SELECT 
          u.id, 
          u.email, 
          u.role, 
          u.avatar,
          COALESCE(s.name, p.name, 'Admin') as name
        FROM users u
        LEFT JOIN students s ON u.id = s.user_id AND s.teacher_id = ?
        LEFT JOIN parents p ON u.id = p.user_id AND p.id IN (
          SELECT ps.parent_id FROM parent_students ps JOIN students st ON ps.student_id = st.id WHERE st.teacher_id = ?
        )
        WHERE (u.role IN ('superadmin', 'admin') OR s.id IS NOT NULL OR p.id IS NOT NULL) 
          AND u.id != ? AND u.status = 'ACTIVE'
        ORDER BY u.role, name ASC
      `, [teacherId, teacherId, currentUserId]);
    } else if (role === 'student') {
      const student = db.get('SELECT teacher_id FROM students WHERE user_id = ?', [currentUserId]);
      const teacherUserId = student && student.teacher_id 
        ? (db.get('SELECT user_id FROM teachers WHERE id = ?', [student.teacher_id])?.user_id || null)
        : null;

      contacts = db.all(`
        SELECT 
          u.id, 
          u.email, 
          u.role, 
          u.avatar,
          COALESCE(t.name, 'Admin') as name
        FROM users u
        LEFT JOIN teachers t ON u.id = t.user_id
        WHERE (u.role IN ('superadmin', 'admin') OR u.id = ?) AND u.id != ? AND u.status = 'ACTIVE'
      `, [teacherUserId, currentUserId]);
    } else if (role === 'parent') {
      const parent = db.get('SELECT id FROM parents WHERE user_id = ?', [currentUserId]);
      const parentId = parent ? parent.id : 0;

      contacts = db.all(`
        SELECT 
          u.id, 
          u.email, 
          u.role, 
          u.avatar,
          COALESCE(t.name, 'Admin') as name
        FROM users u
        LEFT JOIN teachers t ON u.id = t.user_id AND t.id IN (
          SELECT s.teacher_id FROM students s JOIN parent_students ps ON s.id = ps.student_id WHERE ps.parent_id = ?
        )
        WHERE (u.role IN ('superadmin', 'admin') OR t.id IS NOT NULL) AND u.id != ? AND u.status = 'ACTIVE'
      `, [parentId, currentUserId]);
    }

    res.json({ success: true, contacts });
  } catch (err) {
    console.error('Fetch contacts error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch messaging contacts.' });
  }
});

/**
 * GET /api/messages/conversations
 */
router.get('/conversations', (req, res) => {
  try {
    const currentUserId = req.user.id;

    const messages = db.all(`
      SELECT 
        m.*,
        CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END as contact_id
      FROM messages m
      WHERE m.sender_id = ? OR m.receiver_id = ?
      ORDER BY m.sent_at DESC
    `, [currentUserId, currentUserId, currentUserId]);

    // Group by contact
    const conversationMap = new Map();
    messages.forEach(msg => {
      if (!conversationMap.has(msg.contact_id)) {
        conversationMap.set(msg.contact_id, {
          lastMessage: msg,
          unreadCount: 0
        });
      }
      if (msg.receiver_id === currentUserId && msg.is_read === 0) {
        conversationMap.get(msg.contact_id).unreadCount++;
      }
    });

    const conversations = [];
    for (const [contactId, data] of conversationMap.entries()) {
      const contactUser = db.get(`
        SELECT 
          u.id, 
          u.email, 
          u.role, 
          u.avatar,
          COALESCE(t.name, s.name, p.name, u.email) as name
        FROM users u
        LEFT JOIN teachers t ON u.id = t.user_id
        LEFT JOIN students s ON u.id = s.user_id
        LEFT JOIN parents p ON u.id = p.user_id
        WHERE u.id = ?
      `, [contactId]);

      if (contactUser) {
        conversations.push({
          contact: contactUser,
          lastMessage: data.lastMessage,
          unreadCount: data.unreadCount
        });
      }
    }

    res.json({ success: true, conversations });
  } catch (err) {
    console.error('Fetch conversations error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch conversations.' });
  }
});

/**
 * GET /api/messages/thread/:contactId
 */
router.get('/thread/:contactId', (req, res) => {
  try {
    const currentUserId = req.user.id;
    const contactId = parseInt(req.params.contactId);

    // Mark received messages as read
    db.run(`
      UPDATE messages 
      SET is_read = 1 
      WHERE sender_id = ? AND receiver_id = ? AND is_read = 0
    `, [contactId, currentUserId]);

    const thread = db.all(`
      SELECT * FROM messages
      WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
      ORDER BY sent_at ASC
    `, [currentUserId, contactId, contactId, currentUserId]);

    const contact = db.get(`
      SELECT 
        u.id, 
        u.email, 
        u.role, 
        u.avatar,
        COALESCE(t.name, s.name, p.name, u.email) as name
      FROM users u
      LEFT JOIN teachers t ON u.id = t.user_id
      LEFT JOIN students s ON u.id = s.user_id
      LEFT JOIN parents p ON u.id = p.user_id
      WHERE u.id = ?
    `, [contactId]);

    res.json({ success: true, contact, thread });
  } catch (err) {
    console.error('Fetch thread error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch message thread.' });
  }
});

/**
 * POST /api/messages/send
 */
router.post('/send', (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiver_id, content } = req.body;

    if (!receiver_id || !content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Receiver ID and message content are required.' });
    }

    const recId = parseInt(receiver_id);
    const receiver = db.get('SELECT id, email FROM users WHERE id = ?', [recId]);
    if (!receiver) {
      return res.status(404).json({ success: false, message: 'Recipient not found.' });
    }

    const resMsg = db.run(`
      INSERT INTO messages (sender_id, receiver_id, content)
      VALUES (?, ?, ?)
    `, [senderId, recId, content.trim()]);

    res.status(201).json({
      success: true,
      message: 'Message sent.',
      messageId: resMsg.lastInsertRowid,
      sent_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ success: false, message: 'Failed to send message.' });
  }
});

module.exports = router;
