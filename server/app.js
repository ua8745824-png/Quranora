const express = require('express');
const cors = require('cors');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const teacherRoutes = require('./routes/teacher');
const studentRoutes = require('./routes/student');
const parentRoutes = require('./routes/parent');
const messageRoutes = require('./routes/messages');
const notificationRoutes = require('./routes/notifications');
const reportRoutes = require('./routes/reports');

const app = express();

// Standard middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root directory paths
const rootDir = path.join(__dirname, '..');
const portalDir = path.join(rootDir, 'portal');

// 1. Static Assets for Public Website
app.use('/css', express.static(path.join(rootDir, 'css')));
app.use('/js', express.static(path.join(rootDir, 'js')));
app.use('/assets', express.static(path.join(rootDir, 'assets')));

// 2. Static Assets for Management System Portal
app.use('/portal-assets', express.static(path.join(portalDir)));

// 3. API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Quranora Academy API', timestamp: new Date().toISOString() });
});

// 4. Management System Web Portal Page Routes
app.get('/login', (req, res) => {
  res.sendFile(path.join(portalDir, 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(portalDir, 'register.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(portalDir, 'admin.html'));
});

app.get('/teacher', (req, res) => {
  res.sendFile(path.join(portalDir, 'teacher.html'));
});

app.get('/student', (req, res) => {
  res.sendFile(path.join(portalDir, 'student.html'));
});

app.get('/parent', (req, res) => {
  res.sendFile(path.join(portalDir, 'parent.html'));
});

// 5. Existing Public Website Route (Preserved untouched at root '/')
app.get('/', (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

module.exports = app;
