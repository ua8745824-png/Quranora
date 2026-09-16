const express = require('express');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

/**
 * GET /api/notifications
 */
router.get('/', (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = db.all(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 50
    `, [userId]);

    const unreadCount = db.get(`
      SELECT COUNT(*) as count FROM notifications 
      WHERE user_id = ? AND is_read = 0
    `, [userId]).count;

    res.json({ success: true, notifications, unreadCount });
  } catch (err) {
    console.error('Fetch notifications error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
  }
});

/**
 * POST /api/notifications/mark-read
 */
router.post('/mark-read', (req, res) => {
  try {
    const userId = req.user.id;
    const { notification_id } = req.body;

    if (notification_id) {
      db.run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [parseInt(notification_id), userId]);
    } else {
      // Mark all as read
      db.run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
    }

    res.json({ success: true, message: 'Notifications marked as read.' });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ success: false, message: 'Failed to update notifications.' });
  }
});

module.exports = router;
