const bcrypt = require('bcryptjs');
const db = require('./database');

function seedDatabase(force = false) {
  const database = db.getDb();

  // Check if already seeded
  const existingUsers = db.get('SELECT COUNT(*) as count FROM users');
  if (existingUsers && existingUsers.count > 0 && !force) {
    console.log('Database already populated with data. Skipping seed.');
    return;
  }

  if (force) {
    console.log('Clearing existing database tables for fresh seed...');
    database.exec(`
      DELETE FROM notifications;
      DELETE FROM messages;
      DELETE FROM student_notes;
      DELETE FROM payments;
      DELETE FROM fees;
      DELETE FROM expenses;
      DELETE FROM homework_submissions;
      DELETE FROM homework;
      DELETE FROM hifz_records;
      DELETE FROM quran_progress;
      DELETE FROM attendance;
      DELETE FROM classes;
      DELETE FROM parent_students;
      DELETE FROM parents;
      DELETE FROM students;
      DELETE FROM teachers;
      DELETE FROM courses;
      DELETE FROM settings;
      DELETE FROM users;
    `);
  }

  console.log('🌱 Seeding Quranora Academy database with comprehensive multi-role data...');

  const passwordHash = bcrypt.hashSync('admin123', 10);
  const teacherPassHash = bcrypt.hashSync('teacher123', 10);
  const studentPassHash = bcrypt.hashSync('student123', 10);
  const parentPassHash = bcrypt.hashSync('parent123', 10);

  db.transaction(() => {
    // 1. Insert Academy Settings
    const insertSetting = database.prepare('INSERT OR REPLACE INTO settings (key, value, description) VALUES (?, ?, ?)');
    insertSetting.run('academy_name', 'Quranora Online Quran Academy', 'Official Academy Name');
    insertSetting.run('academy_email', 'syedumarali37406@gmail.com', 'Official Academy Email');
    insertSetting.run('academy_phone', '+92 329 5056701', 'Official Academy WhatsApp/Phone');
    insertSetting.run('academy_currency', 'USD', 'Default Platform Currency');
    insertSetting.run('academy_timezone', 'Europe/London', 'Default Academy Operational Timezone');
    insertSetting.run('zoom_default_link', 'https://meet.google.com/quranora-live-class', 'Default Online Classroom Link');
    insertSetting.run('sibling_discount_pct', '10', 'Sibling and Family Discount Percentage');
    insertSetting.run('registration_auto_approval', '0', 'Requires Admin Approval for New Registrations');

    // 2. Insert Courses
    const insertCourse = database.prepare(`
      INSERT INTO courses (id, title, title_ar, description, category, duration_mins, fee_monthly, currency, level, badge, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertCourse.run(
      'nazra-quran',
      'Nazra Quran',
      'ناظرہ قرآن پاک',
      'Learn fluent Quran recitation from Noorani Qaida to full Quran reading with correct articulation.',
      'kids-quran',
      30,
      45.0,
      'USD',
      'Beginner',
      'Foundation',
      'ACTIVE'
    );

    insertCourse.run(
      'quran-tajweed',
      'Quran with Tajweed',
      'تجوید القرآن الکریم',
      'Master classical articulation points (Makharij), rules of Noon & Meem Sakinah, Madd, and voice pacing.',
      'quran',
      30,
      55.0,
      'USD',
      'Intermediate',
      'Most Popular',
      'ACTIVE'
    );

    insertCourse.run(
      'hifz-quran',
      'Hifz-ul-Quran (Memorization)',
      'حفظ القرآن الکریم',
      'Structured step-by-step Quran memorization with daily Sabaq, Sabqi, and Manzil revision system.',
      'quran',
      45,
      75.0,
      'USD',
      'Intensive',
      'Featured',
      'ACTIVE'
    );

    insertCourse.run(
      'quran-translation',
      'Quran Translation (Tarjuma)',
      'ترجمہ قرآن مجید',
      'Word-by-word and contextual translation of the Holy Quran for deep comprehension.',
      'advanced',
      30,
      50.0,
      'USD',
      'Intermediate',
      'Understanding',
      'ACTIVE'
    );

    insertCourse.run(
      'tafseer-quran',
      'Tafseer-ul-Quran',
      'تفسیر القرآن الکریم',
      'In-depth thematic and historical commentary on Divine revelation and practical life guidance.',
      'advanced',
      40,
      60.0,
      'USD',
      'Advanced',
      'Scholarly',
      'ACTIVE'
    );

    insertCourse.run(
      'islamic-studies',
      'Islamic Studies for Kids',
      'اسلامک اسٹڈیز برائے اطفال',
      'Comprehensive Islamic curriculum covering Daily Duas, Hadith stories, Seerah, Pillars, and Akhlaq.',
      'kids',
      30,
      40.0,
      'USD',
      'Beginner',
      'Kids Favorite',
      'ACTIVE'
    );

    insertCourse.run(
      'namaz-course',
      'Namaz & Daily Duas Course',
      'نماز اور مسنون دعائیں',
      'Correct practical method of Wudu, 5 daily prayers according to Sunnah, and essential Masnoon Duas.',
      'foundation',
      30,
      35.0,
      'USD',
      'Beginner',
      'Essential',
      'ACTIVE'
    );

    // 3. Insert Admin Users
    const insertUser = database.prepare(`
      INSERT INTO users (email, password_hash, role, status, avatar)
      VALUES (?, ?, ?, ?, ?)
    `);

    const adminUser = insertUser.run('admin@quranora.com', passwordHash, 'superadmin', 'ACTIVE', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150');
    const staffUser = insertUser.run('staff@quranora.com', passwordHash, 'admin', 'ACTIVE', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150');

    // 4. Insert Teachers
    const insertTeacher = database.prepare(`
      INSERT INTO teachers (user_id, name, email, phone, gender, bio, qualification, hourly_rate, monthly_salary, zoom_link, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const teacherUmarUser = insertUser.run('teacher.umar@quranora.com', teacherPassHash, 'teacher', 'ACTIVE', 'assets/images/teacher_umar.jpg');
    const teacherUmarId = insertTeacher.run(
      teacherUmarUser.lastInsertRowid,
      'Al-Qari Syed Umar Ali',
      'teacher.umar@quranora.com',
      '+92 329 5056701',
      'male',
      'Senior Qari & Founder. 8+ years international teaching experience across UK, USA, and Gulf.',
      'Shahadat-ul-Almiya, Hafiz-ul-Quran & Certified Tajweed Qari',
      20.0,
      850.0,
      'https://meet.google.com/quranora-umar',
      1
    ).lastInsertRowid;

    const teacherMueezUser = insertUser.run('teacher.mueez@quranora.com', teacherPassHash, 'teacher', 'ACTIVE', 'assets/images/teacher_mueez.jpg');
    const teacherMueezId = insertTeacher.run(
      teacherMueezUser.lastInsertRowid,
      'Al-Qari Mueez ur Rehman',
      'teacher.mueez@quranora.com',
      '+92 300 1234567',
      'male',
      'Master Qari with Ijazah in 10 Qiraat. Specialist in child pedagogy and intensive Hifz coaching.',
      'Ijazah in Hafs & Shu’bah, 6+ Years Experience',
      18.0,
      750.0,
      'https://meet.google.com/quranora-mueez',
      1
    ).lastInsertRowid;

    const teacherAmmarUser = insertUser.run('teacher.ammar@quranora.com', teacherPassHash, 'teacher', 'ACTIVE', 'assets/images/teacher_ammar.jpg');
    const teacherAmmarId = insertTeacher.run(
      teacherAmmarUser.lastInsertRowid,
      'Maulana Syed Ammar Hussain Shah',
      'teacher.ammar@quranora.com',
      '+92 301 9876543',
      'male',
      'Islamic Scholar & Arabic Grammarian. Expert in Quranic Translation, Tafseer and Fiqh.',
      'Dars-e-Nizami Graduate (Alimiyyah), M.A. Islamic Studies',
      18.0,
      700.0,
      'https://meet.google.com/quranora-ammar',
      1
    ).lastInsertRowid;

    const teacherFatimaUser = insertUser.run('teacher.fatimaz@quranora.com', teacherPassHash, 'teacher', 'ACTIVE', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150');
    const teacherFatimaId = insertTeacher.run(
      teacherFatimaUser.lastInsertRowid,
      'Ustadhah Fatima Zahra',
      'teacher.fatimaz@quranora.com',
      '+92 333 4455667',
      'female',
      'Dedicated female tutor specializing in Noorani Qaida, gentle guidance for young sisters and children.',
      'Hafiza & Sanad in Noorani Qaida Method',
      16.0,
      650.0,
      'https://meet.google.com/quranora-fatima',
      1
    ).lastInsertRowid;

    // 5. Insert Parents
    const insertParent = database.prepare(`
      INSERT INTO parents (user_id, name, email, phone, address, country)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const parentFatimaUser = insertUser.run('parent.fatima@gmail.com', parentPassHash, 'parent', 'ACTIVE', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150');
    const parentFatimaId = insertParent.run(
      parentFatimaUser.lastInsertRowid,
      'Fatima Khan (Parent)',
      'parent.fatima@gmail.com',
      '+44 7911 123456',
      '42 Crescent Rd, Birmingham',
      'United Kingdom'
    ).lastInsertRowid;

    const parentMansoorUser = insertUser.run('parent.mansoor@gmail.com', parentPassHash, 'parent', 'ACTIVE', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150');
    const parentMansoorId = insertParent.run(
      parentMansoorUser.lastInsertRowid,
      'Mansoor Ahmed (Parent)',
      'parent.mansoor@gmail.com',
      '+1 416 555 0199',
      '78 Maple Leaf Dr, Toronto',
      'Canada'
    ).lastInsertRowid;

    // 6. Insert Students (Active & Pending)
    const insertStudent = database.prepare(`
      INSERT INTO students (user_id, name, email, age, phone, country, city, timezone, course_id, teacher_id, monthly_fee, currency, registration_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Student 1: Ahmed Khan (Active - Quran with Tajweed)
    const s1User = insertUser.run('student.ahmed@gmail.com', studentPassHash, 'student', 'ACTIVE', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150');
    const s1Id = insertStudent.run(
      s1User.lastInsertRowid,
      'Ahmed Khan',
      'student.ahmed@gmail.com',
      12,
      '+44 7911 123456',
      'United Kingdom',
      'Birmingham',
      'Europe/London',
      'quran-tajweed',
      teacherUmarId,
      55.0,
      'GBP',
      '2026-08-01',
      'Very enthusiastic student. Needs attention on Noon Sakinah Ghunnah.'
    ).lastInsertRowid;

    // Student 2: Maryam Khan (Active - Nazra Quran, Sibling of Ahmed)
    const s2User = insertUser.run('student.maryam@gmail.com', studentPassHash, 'student', 'ACTIVE', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150');
    const s2Id = insertStudent.run(
      s2User.lastInsertRowid,
      'Maryam Khan',
      'student.maryam@gmail.com',
      8,
      '+44 7911 123456',
      'United Kingdom',
      'Birmingham',
      'Europe/London',
      'nazra-quran',
      teacherFatimaId,
      45.0,
      'GBP',
      '2026-08-05',
      'Young sister learning Noorani Qaida Lesson 12.'
    ).lastInsertRowid;

    // Link Ahmed and Maryam to Parent Fatima Khan
    const insertParentStudent = database.prepare('INSERT INTO parent_students (parent_id, student_id, relationship) VALUES (?, ?, ?)');
    insertParentStudent.run(parentFatimaId, s1Id, 'Mother');
    insertParentStudent.run(parentFatimaId, s2Id, 'Mother');

    // Student 3: Zayd Mansoor (Active - Hifz-ul-Quran)
    const s3User = insertUser.run('student.zayd@gmail.com', studentPassHash, 'student', 'ACTIVE', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150');
    const s3Id = insertStudent.run(
      s3User.lastInsertRowid,
      'Zayd Mansoor',
      'student.zayd@gmail.com',
      10,
      '+1 416 555 0199',
      'Canada',
      'Toronto',
      'America/Toronto',
      'hifz-quran',
      teacherMueezId,
      75.0,
      'CAD',
      '2026-07-15',
      'Hifz track. Currently on Juz 3 (Surah Al-Imran). Excellent retention.'
    ).lastInsertRowid;
    insertParentStudent.run(parentMansoorId, s3Id, 'Father');

    // Student 4: Ibrahim Al-Sayed (Active - Quran Translation)
    const s4User = insertUser.run('student.ibrahim@gmail.com', studentPassHash, 'student', 'ACTIVE', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150');
    const s4Id = insertStudent.run(
      s4User.lastInsertRowid,
      'Ibrahim Al-Sayed',
      'student.ibrahim@gmail.com',
      15,
      '+1 312 555 0144',
      'United States',
      'Chicago',
      'America/Chicago',
      'quran-translation',
      teacherAmmarId,
      50.0,
      'USD',
      '2026-08-10',
      'Studying word-by-word translation of Surah Yaseen and Surah Al-Mulk.'
    ).lastInsertRowid;

    // Student 5: Ayesha Malik (Active - Islamic Studies for Kids)
    const s5User = insertUser.run('student.ayesha@gmail.com', studentPassHash, 'student', 'ACTIVE', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150');
    const s5Id = insertStudent.run(
      s5User.lastInsertRowid,
      'Ayesha Malik',
      'student.ayesha@gmail.com',
      9,
      '+61 2 9876 5432',
      'Australia',
      'Sydney',
      'Australia/Sydney',
      'islamic-studies',
      teacherFatimaId,
      40.0,
      'AUD',
      '2026-08-20',
      'Memorized 15 daily Duas and Kalimahs.'
    ).lastInsertRowid;

    // Student 6: Hamza Tariq (Active - Quran with Tajweed)
    const s6User = insertUser.run('student.hamza@gmail.com', studentPassHash, 'student', 'ACTIVE', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150');
    const s6Id = insertStudent.run(
      s6User.lastInsertRowid,
      'Hamza Tariq',
      'student.hamza@gmail.com',
      14,
      '+971 50 123 4567',
      'United Arab Emirates',
      'Dubai',
      'Asia/Dubai',
      'quran-tajweed',
      teacherUmarId,
      55.0,
      'AED',
      '2026-08-25',
      'Focusing on Makharij of throat letters and Qalqalah.'
    ).lastInsertRowid;

    // Student 7 & 8: Pending Registrations (to demonstrate Admin Approval flow)
    const s7User = insertUser.run('pending.bilal@gmail.com', studentPassHash, 'student', 'PENDING', null);
    insertStudent.run(
      s7User.lastInsertRowid,
      'Bilal Arshad',
      'pending.bilal@gmail.com',
      11,
      '+1 212 555 0188',
      'United States',
      'New York',
      'America/New_York',
      'hifz-quran',
      teacherMueezId,
      75.0,
      'USD',
      '2026-09-15',
      'Applied online. Awaiting admin class slot approval.'
    );

    const s8User = insertUser.run('pending.zainab@gmail.com', studentPassHash, 'student', 'PENDING', null);
    insertStudent.run(
      s8User.lastInsertRowid,
      'Zainab Rashid',
      'pending.zainab@gmail.com',
      7,
      '+44 20 7946 0999',
      'United Kingdom',
      'London',
      'Europe/London',
      'nazra-quran',
      teacherFatimaId,
      45.0,
      'GBP',
      '2026-09-16',
      'Registered for 3-day free trial.'
    );

    // 7. Insert Scheduled Classes
    const insertClass = database.prepare(`
      INSERT INTO classes (title, course_id, teacher_id, student_id, days_of_week, start_time, end_time, timezone, meeting_link, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const c1Id = insertClass.run(
      'Tajweed Mastery - Ahmed Khan',
      'quran-tajweed',
      teacherUmarId,
      s1Id,
      JSON.stringify(['Monday', 'Wednesday', 'Friday']),
      '18:00',
      '18:30',
      'Europe/London',
      'https://meet.google.com/quranora-umar',
      'ACTIVE'
    ).lastInsertRowid;

    const c2Id = insertClass.run(
      'Noorani Qaida - Maryam Khan',
      'nazra-quran',
      teacherFatimaId,
      s2Id,
      JSON.stringify(['Monday', 'Wednesday', 'Friday']),
      '17:00',
      '17:30',
      'Europe/London',
      'https://meet.google.com/quranora-fatima',
      'ACTIVE'
    ).lastInsertRowid;

    const c3Id = insertClass.run(
      'Daily Hifz Intensive - Zayd Mansoor',
      'hifz-quran',
      teacherMueezId,
      s3Id,
      JSON.stringify(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
      '16:30',
      '17:15',
      'America/Toronto',
      'https://meet.google.com/quranora-mueez',
      'ACTIVE'
    ).lastInsertRowid;

    const c4Id = insertClass.run(
      'Quran Translation & Tafseer - Ibrahim',
      'quran-translation',
      teacherAmmarId,
      s4Id,
      JSON.stringify(['Tuesday', 'Thursday', 'Saturday']),
      '19:00',
      '19:40',
      'America/Chicago',
      'https://meet.google.com/quranora-ammar',
      'ACTIVE'
    ).lastInsertRowid;

    const c5Id = insertClass.run(
      'Islamic Studies - Ayesha Malik',
      'islamic-studies',
      teacherFatimaId,
      s5Id,
      JSON.stringify(['Saturday', 'Sunday']),
      '10:00',
      '10:30',
      'Australia/Sydney',
      'https://meet.google.com/quranora-fatima',
      'ACTIVE'
    ).lastInsertRowid;

    const c6Id = insertClass.run(
      'Tajweed & Qiraat - Hamza Tariq',
      'quran-tajweed',
      teacherUmarId,
      s6Id,
      JSON.stringify(['Sunday', 'Tuesday', 'Thursday']),
      '20:00',
      '20:30',
      'Asia/Dubai',
      'https://meet.google.com/quranora-umar',
      'ACTIVE'
    ).lastInsertRowid;

    // 8. Insert Hifz Tracker Record for Zayd Mansoor
    const insertHifz = database.prepare(`
      INSERT INTO hifz_records (student_id, current_juz, current_surah, memorized_ayahs, total_memorized_juz, daily_target_lines, weekly_target_pages, manzil_revision_cycle_days, completion_pct)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertHifz.run(s3Id, 3, 3, 580, 2.5, 15, 6, 7, 8.3);

    // 9. Insert Historical Attendance Records
    const insertAttendance = database.prepare(`
      INSERT OR REPLACE INTO attendance (class_id, student_id, teacher_id, date, status, teacher_notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Past 7 days attendance for Ahmed Khan
    insertAttendance.run(c1Id, s1Id, teacherUmarId, '2026-09-08', 'PRESENT', 'Attended on time. Practiced Surah Al-Baqarah Ayahs 255-257.');
    insertAttendance.run(c1Id, s1Id, teacherUmarId, '2026-09-10', 'PRESENT', 'Excellent focus today. Noon Sakinah rules cleared.');
    insertAttendance.run(c1Id, s1Id, teacherUmarId, '2026-09-12', 'LATE', 'Joined 5 mins late due to school traffic.');
    insertAttendance.run(c1Id, s1Id, teacherUmarId, '2026-09-15', 'PRESENT', 'Completed Surah Al-Mulk recitation test.');

    // Attendance for Maryam Khan
    insertAttendance.run(c2Id, s2Id, teacherFatimaId, '2026-09-08', 'PRESENT', 'Noorani Qaida Page 18 recitation.');
    insertAttendance.run(c2Id, s2Id, teacherFatimaId, '2026-09-10', 'PRESENT', 'Learned Tanween rules.');
    insertAttendance.run(c2Id, s2Id, teacherFatimaId, '2026-09-15', 'PRESENT', 'Very good recitation of Surah Al-Ikhlas.');

    // Attendance for Zayd (Hifz)
    insertAttendance.run(c3Id, s3Id, teacherMueezId, '2026-09-11', 'PRESENT', 'Recited 1 page Sabaq flawlessly.');
    insertAttendance.run(c3Id, s3Id, teacherMueezId, '2026-09-12', 'PRESENT', 'Sabqi test passed with A grade.');
    insertAttendance.run(c3Id, s3Id, teacherMueezId, '2026-09-15', 'PRESENT', 'Manzil revision Juz 1 completed.');

    // 10. Insert Quran Progress Records
    const insertProgress = database.prepare(`
      INSERT INTO quran_progress (student_id, teacher_id, date, surah_number, surah_name, juz_number, ayah_from, ayah_to, reading_rating, tajweed_rating, memorization_rating, revision_status, mistakes_count, teacher_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertProgress.run(s1Id, teacherUmarId, '2026-09-10', 67, 'Al-Mulk', 29, 1, 15, 'VERY_GOOD', 'VERY_GOOD', 'GOOD', 'READING', 2, 'Great progress on Madd Munfasil. Revise Ayah 10.');
    insertProgress.run(s1Id, teacherUmarId, '2026-09-15', 67, 'Al-Mulk', 29, 16, 30, 'EXCELLENT', 'EXCELLENT', 'VERY_GOOD', 'READING', 0, 'MashaAllah fluent reading of the entire Surah Al-Mulk.');

    insertProgress.run(s3Id, teacherMueezId, '2026-09-12', 3, 'Ali Imran', 3, 1, 20, 'EXCELLENT', 'EXCELLENT', 'EXCELLENT', 'SABAQ', 1, 'Strong memorization. Only 1 waqf pause correction.');
    insertProgress.run(s3Id, teacherMueezId, '2026-09-15', 3, 'Ali Imran', 3, 21, 35, 'EXCELLENT', 'VERY_GOOD', 'EXCELLENT', 'SABAQ', 0, 'Passed new lesson in single sitting.');

    insertProgress.run(s2Id, teacherFatimaId, '2026-09-15', 112, 'Al-Ikhlas', 30, 1, 4, 'VERY_GOOD', 'GOOD', 'EXCELLENT', 'REVISION', 1, 'Recited with beautiful sweet voice.');

    // 11. Insert Homework
    const insertHomework = database.prepare(`
      INSERT INTO homework (class_id, teacher_id, student_id, title, description, due_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const hw1Id = insertHomework.run(
      c1Id,
      teacherUmarId,
      s1Id,
      'Tajweed Practice: Surah Al-Mulk (Ayah 1-15)',
      'Record an audio recitation of Surah Al-Mulk Ayahs 1 to 15 paying close attention to Ikhfa and Ghunnah.',
      '2026-09-18',
      'GRADED'
    ).lastInsertRowid;

    const hw2Id = insertHomework.run(
      c1Id,
      teacherUmarId,
      s1Id,
      'Noon & Meem Sakinah Rules Worksheet',
      'Write down 3 examples of Idgham with Ghunnah and 3 examples of Idgham without Ghunnah from Surah Al-Baqarah.',
      '2026-09-22',
      'PENDING'
    ).lastInsertRowid;

    const hw3Id = insertHomework.run(
      c3Id,
      teacherMueezId,
      s3Id,
      'Hifz Audio Submission: Surah Ali-Imran (Ayah 1-30)',
      'Record complete Sabaq + Sabqi session audio without looking at Mushaf.',
      '2026-09-19',
      'SUBMITTED'
    ).lastInsertRowid;

    // Submissions
    const insertSubmission = database.prepare(`
      INSERT INTO homework_submissions (homework_id, student_id, submission_text, file_url, submitted_at, grade, teacher_feedback, graded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertSubmission.run(
      hw1Id,
      s1Id,
      'Assalam-o-Alaikum Teacher Umar, here is my recitation audio recording for Surah Al-Mulk.',
      'https://audio.quranora.com/submissions/ahmed_mulk_1_15.mp3',
      '2026-09-14 20:15:00',
      'A+',
      'MashaAllah Ahmed, your pronunciation has improved immensely! Pay attention to the Ghunnah on Ayah 8.',
      '2026-09-15 09:30:00'
    );

    insertSubmission.run(
      hw3Id,
      s3Id,
      'Completed today before Maghrib. Ayah 1 to 30 continuous recitation.',
      'https://audio.quranora.com/submissions/zayd_imran_1_30.mp3',
      '2026-09-16 08:00:00',
      null,
      null,
      null
    );

    // 12. Insert Monthly Fees & Invoices
    const insertFee = database.prepare(`
      INSERT INTO fees (invoice_number, student_id, month_year, gross_amount, discount, net_amount, paid_amount, pending_amount, currency, due_date, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const fee1Id = insertFee.run(
      'INV-2026-09-001',
      s1Id,
      '2026-09',
      55.0,
      5.5, // 10% Sibling Discount
      49.5,
      49.5,
      0.0,
      'GBP',
      '2026-09-05',
      'PAID',
      'September 2026 Tuition (Sibling Discount Applied)'
    ).lastInsertRowid;

    const fee2Id = insertFee.run(
      'INV-2026-09-002',
      s2Id,
      '2026-09',
      45.0,
      4.5,
      40.5,
      40.5,
      0.0,
      'GBP',
      '2026-09-05',
      'PAID',
      'September 2026 Tuition (Sibling Discount Applied)'
    ).lastInsertRowid;

    const fee3Id = insertFee.run(
      'INV-2026-09-003',
      s3Id,
      '2026-09',
      75.0,
      0.0,
      75.0,
      75.0,
      0.0,
      'CAD',
      '2026-09-05',
      'PAID',
      'September 2026 Hifz Track'
    ).lastInsertRowid;

    const fee4Id = insertFee.run(
      'INV-2026-09-004',
      s4Id,
      '2026-09',
      50.0,
      0.0,
      50.0,
      0.0,
      50.0,
      'USD',
      '2026-09-20',
      'PENDING',
      'September 2026 Translation Course'
    ).lastInsertRowid;

    const fee5Id = insertFee.run(
      'INV-2026-09-005',
      s6Id,
      '2026-09',
      55.0,
      0.0,
      55.0,
      0.0,
      55.0,
      'AED',
      '2026-09-10',
      'OVERDUE',
      'September 2026 Tajweed Course'
    ).lastInsertRowid;

    // 13. Insert Payment Transactions
    const insertPayment = database.prepare(`
      INSERT INTO payments (fee_id, student_id, amount, currency, payment_method, transaction_ref, payment_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertPayment.run(fee1Id, s1Id, 49.5, 'GBP', 'STRIPE', 'pi_3Kquranora_ahmed_sep', '2026-09-04', 'Paid online via Stripe credit card.');
    insertPayment.run(fee2Id, s2Id, 40.5, 'GBP', 'STRIPE', 'pi_3Kquranora_maryam_sep', '2026-09-04', 'Paid online via Stripe credit card.');
    insertPayment.run(fee3Id, s3Id, 75.0, 'CAD', 'PAYPAL', 'PAYID-MUEEZ-ZAYD-7788', '2026-09-03', 'PayPal verified transaction.');

    // 14. Insert Operational Expenses (P&L Tracking)
    const insertExpense = database.prepare(`
      INSERT INTO expenses (category, title, amount, currency, expense_date, payment_method, receipt_ref, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertExpense.run('Salaries', 'Teacher Umar Ali Monthly Payout', 850.0, 'USD', '2026-09-01', 'BANK_TRANSFER', 'TXN-SAL-0826-01', 'Faculty salary for August', adminUser.lastInsertRowid);
    insertExpense.run('Salaries', 'Teacher Mueez ur Rehman Payout', 750.0, 'USD', '2026-09-01', 'BANK_TRANSFER', 'TXN-SAL-0826-02', 'Faculty salary for August', adminUser.lastInsertRowid);
    insertExpense.run('Software & Zoom', 'Zoom Pro Education Multi-Host License', 65.0, 'USD', '2026-09-03', 'CREDIT_CARD', 'REC-ZOOM-SEP26', 'Zoom Pro classrooms subscription', adminUser.lastInsertRowid);
    insertExpense.run('Hosting', 'Vercel Pro & Cloud Database Cluster', 40.0, 'USD', '2026-09-02', 'CREDIT_CARD', 'REC-VCL-0926', 'Monthly cloud hosting', adminUser.lastInsertRowid);
    insertExpense.run('Marketing', 'Meta & Google Ads Campaign (UK/USA)', 220.0, 'USD', '2026-09-07', 'CREDIT_CARD', 'FB-ADS-UKUSA-26', 'Targeting parents in London and Texas', adminUser.lastInsertRowid);

    // 15. Insert Direct Messages
    const insertMessage = database.prepare(`
      INSERT INTO messages (sender_id, receiver_id, content, is_read, sent_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    // Admin <-> Teacher Umar
    insertMessage.run(adminUser.lastInsertRowid, teacherUmarUser.lastInsertRowid, 'Assalam-o-Alaikum Qari Sahib, we have scheduled 2 new student demo classes for Thursday.', 1, '2026-09-14 11:00:00');
    insertMessage.run(teacherUmarUser.lastInsertRowid, adminUser.lastInsertRowid, 'Wa Alaikum Assalam. InshaAllah I have verified the timing and added them to my schedule.', 1, '2026-09-14 11:30:00');

    // Teacher Umar <-> Student Ahmed
    insertMessage.run(teacherUmarUser.lastInsertRowid, s1User.lastInsertRowid, 'Assalam-o-Alaikum Ahmed, please prepare Surah Al-Mulk Ayahs 16-30 for tomorrow class.', 1, '2026-09-14 18:00:00');
    insertMessage.run(s1User.lastInsertRowid, teacherUmarUser.lastInsertRowid, 'Wa Alaikum Assalam Ustadhi, I have submitted my audio recording as well!', 0, '2026-09-15 08:30:00');

    // Teacher Umar <-> Parent Fatima Khan
    insertMessage.run(teacherUmarUser.lastInsertRowid, parentFatimaUser.lastInsertRowid, 'Respected Sister Fatima, Ahmed did exceptional work in Tajweed today. MashaAllah!', 1, '2026-09-15 19:00:00');
    insertMessage.run(parentFatimaUser.lastInsertRowid, teacherUmarUser.lastInsertRowid, 'JazakAllah Khair Qari Sahib for your constant dedication and patience with Ahmed.', 0, '2026-09-15 19:45:00');

    // 16. Insert Notifications
    const insertNotification = database.prepare(`
      INSERT INTO notifications (user_id, title, message, type, link, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertNotification.run(adminUser.lastInsertRowid, 'New Student Registration Pending', 'Bilal Arshad has registered for Hifz-ul-Quran and is awaiting approval.', 'ALERT', '/admin#students', 0, '2026-09-15 14:00:00');
    insertNotification.run(adminUser.lastInsertRowid, 'New Student Registration Pending', 'Zainab Rashid has registered for Nazra Quran and is awaiting approval.', 'ALERT', '/admin#students', 0, '2026-09-16 09:00:00');
    insertNotification.run(s1User.lastInsertRowid, 'Homework Graded', 'Al-Qari Syed Umar Ali graded your Tajweed assignment: A+ with feedback!', 'HOMEWORK', '/student#homework', 0, '2026-09-15 09:30:00');
    insertNotification.run(s1User.lastInsertRowid, 'Class Reminder', 'Live Tajweed Class begins in 1 hour with Al-Qari Syed Umar Ali.', 'CLASS', '/student#schedule', 0, '2026-09-16 17:00:00');
    insertNotification.run(parentFatimaUser.lastInsertRowid, 'Tuition Payment Confirmed', 'Payment receipt for Ahmed Khan (September 2026) has been generated.', 'FEE', '/parent#fees', 0, '2026-09-04 15:00:00');

    // 17. Insert Teacher Private Diary Notes
    const insertNote = database.prepare(`
      INSERT INTO student_notes (student_id, teacher_id, title, note_content, is_pinned)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertNote.run(s1Id, teacherUmarId, 'Tajweed Evaluation Notes', 'Mastered Noon Sakinah. Next milestone: Rules of Madd Lazim and Waqf signs.', 1);
    insertNote.run(s3Id, teacherMueezId, 'Hifz Memory Stamina', 'Memorizes 15 lines in 35 minutes. Retention is strong on Manzil Juz 1-2.', 1);

    console.log('✅ Database seeded successfully!');
  });
}

// Auto-run if executed directly
if (require.main === module) {
  seedDatabase(true);
}

module.exports = {
  seedDatabase
};
