-- ============================================================================
-- Quranora Academy Management System — Relational Database Schema
-- SQLite3 with Foreign Keys, Indexes, Constraints, and Timestamps
-- ============================================================================

PRAGMA foreign_keys = ON;

-- 1. Users Table (Authentication & Base Role)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('superadmin', 'admin', 'teacher', 'student', 'parent')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'PENDING', 'REJECTED', 'SUSPENDED')),
  avatar TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Teachers Profile Table
CREATE TABLE IF NOT EXISTS teachers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  gender TEXT CHECK(gender IN ('male', 'female')),
  bio TEXT,
  qualification TEXT,
  hourly_rate REAL DEFAULT 15.0,
  monthly_salary REAL DEFAULT 500.0,
  zoom_link TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Parents Profile Table
CREATE TABLE IF NOT EXISTS parents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  country TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Courses Table
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY, -- e.g. 'nazra-quran', 'quran-tajweed', 'hifz-quran'
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  category TEXT DEFAULT 'quran',
  duration_mins INTEGER DEFAULT 30,
  fee_monthly REAL DEFAULT 50.0,
  currency TEXT DEFAULT 'USD',
  level TEXT DEFAULT 'All Levels',
  badge TEXT,
  status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'INACTIVE')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Students Profile Table
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  age INTEGER,
  phone TEXT,
  country TEXT,
  city TEXT,
  timezone TEXT DEFAULT 'UTC',
  course_id TEXT,
  teacher_id INTEGER,
  monthly_fee REAL DEFAULT 50.0,
  currency TEXT DEFAULT 'USD',
  registration_date DATE DEFAULT (DATE('now')),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
);

-- 6. Parent-Student Relationship Table (Supports Multiple Children per Parent)
CREATE TABLE IF NOT EXISTS parent_students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  relationship TEXT DEFAULT 'Parent', -- 'Father', 'Mother', 'Guardian'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(parent_id, student_id),
  FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 7. Classes / Sessions Schedule Table
CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  course_id TEXT NOT NULL,
  teacher_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  days_of_week TEXT NOT NULL, -- JSON array string e.g. '["Monday","Wednesday","Friday"]'
  start_time TEXT NOT NULL, -- '18:00' (24h format)
  end_time TEXT NOT NULL, -- '18:30'
  timezone TEXT DEFAULT 'UTC',
  meeting_link TEXT, -- Zoom, Google Meet, or Jitsi WebRTC
  status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 8. Attendance Records Table
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER,
  student_id INTEGER NOT NULL,
  teacher_id INTEGER NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('PRESENT', 'ABSENT', 'LATE', 'LEAVE')),
  teacher_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, date),
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
);

-- 9. Quran Progress Log Table
CREATE TABLE IF NOT EXISTS quran_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  teacher_id INTEGER NOT NULL,
  date DATE NOT NULL,
  surah_number INTEGER, -- 1 to 114
  surah_name TEXT,
  juz_number INTEGER, -- 1 to 30
  ayah_from INTEGER,
  ayah_to INTEGER,
  reading_rating TEXT CHECK(reading_rating IN ('EXCELLENT', 'VERY_GOOD', 'GOOD', 'NEEDS_PRACTICE')),
  tajweed_rating TEXT CHECK(tajweed_rating IN ('EXCELLENT', 'VERY_GOOD', 'GOOD', 'NEEDS_PRACTICE')),
  memorization_rating TEXT CHECK(memorization_rating IN ('EXCELLENT', 'VERY_GOOD', 'GOOD', 'NEEDS_PRACTICE')),
  revision_status TEXT DEFAULT 'SABAQ' CHECK(revision_status IN ('SABAQ', 'SABQI', 'MANZIL', 'READING', 'REVISION')),
  mistakes_count INTEGER DEFAULT 0,
  teacher_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
);

-- 10. Hifz Specific Tracker Table
CREATE TABLE IF NOT EXISTS hifz_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER UNIQUE NOT NULL,
  current_juz INTEGER DEFAULT 1,
  current_surah INTEGER DEFAULT 1,
  memorized_ayahs INTEGER DEFAULT 0,
  total_memorized_juz REAL DEFAULT 0.0,
  daily_target_lines INTEGER DEFAULT 15,
  weekly_target_pages INTEGER DEFAULT 5,
  manzil_revision_cycle_days INTEGER DEFAULT 7,
  completion_pct REAL DEFAULT 0.0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 11. Homework Assignments Table
CREATE TABLE IF NOT EXISTS homework (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER,
  teacher_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  due_date DATE NOT NULL,
  attachment_url TEXT,
  status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'SUBMITTED', 'GRADED', 'OVERDUE')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 12. Homework Submissions Table
CREATE TABLE IF NOT EXISTS homework_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  homework_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  submission_text TEXT,
  file_url TEXT,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  grade TEXT, -- 'A+', 'A', 'B', 'C', 'Needs Improvement'
  teacher_feedback TEXT,
  graded_at DATETIME,
  FOREIGN KEY (homework_id) REFERENCES homework(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 13. Fees & Monthly Invoices Table
CREATE TABLE IF NOT EXISTS fees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT UNIQUE NOT NULL,
  student_id INTEGER NOT NULL,
  month_year TEXT NOT NULL, -- e.g. '2026-09'
  gross_amount REAL NOT NULL,
  discount REAL DEFAULT 0.0,
  net_amount REAL NOT NULL,
  paid_amount REAL DEFAULT 0.0,
  pending_amount REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK(status IN ('PAID', 'PENDING', 'OVERDUE', 'PARTIALLY_PAID', 'CANCELLED')),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 14. Fee Payments Transactions Table
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fee_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  payment_method TEXT NOT NULL CHECK(payment_method IN ('CASH', 'BANK_TRANSFER', 'STRIPE', 'PAYPAL', 'EASYPAISA', 'JAZZCASH', 'CREDIT_CARD')),
  transaction_ref TEXT,
  payment_date DATE NOT NULL,
  receipt_url TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fee_id) REFERENCES fees(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 15. Academy Expenses Table (P&L Tracking)
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL, -- 'Salaries', 'Software & Zoom', 'Marketing', 'Utilities', 'Hosting', 'Other'
  title TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  expense_date DATE NOT NULL,
  payment_method TEXT DEFAULT 'BANK_TRANSFER',
  receipt_ref TEXT,
  notes TEXT,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 16. Messages & Direct Internal Communication Table
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL,
  receiver_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 17. System & Role Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'INFO' CHECK(type IN ('INFO', 'SUCCESS', 'WARNING', 'ALERT', 'CLASS', 'FEE', 'HOMEWORK')),
  link TEXT,
  is_read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 18. Student Private Notes (Teacher Diary)
CREATE TABLE IF NOT EXISTS student_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  teacher_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  note_content TEXT NOT NULL,
  is_pinned INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
);

-- 19. Academy Settings & Configuration Table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Indexes for High Performance & Rapid Lookups
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_students_teacher ON students(teacher_id);
CREATE INDEX IF NOT EXISTS idx_students_course ON students(course_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_student ON classes(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_quran_progress_student ON quran_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_homework_student ON homework(student_id);
CREATE INDEX IF NOT EXISTS idx_fees_student ON fees(student_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
