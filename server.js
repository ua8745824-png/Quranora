const app = require('./server/app');
const config = require('./server/config/config');
const db = require('./server/db/database');
const { seedDatabase } = require('./server/db/seed');

// Initialize database and auto-seed if empty
try {
  db.getDb();
  seedDatabase(false); // seed only if empty
} catch (err) {
  console.error('Database initialization warning:', err);
}

const PORT = config.PORT;

app.listen(PORT, () => {
  console.log('====================================================');
  console.log('🌟 QURANORA ONLINE ACADEMY PLATFORM RUNNING');
  console.log(`🌐 Public Website:      http://localhost:${PORT}/`);
  console.log(`🔐 Management Portal:   http://localhost:${PORT}/login`);
  console.log(`👑 Admin Portal:        http://localhost:${PORT}/admin`);
  console.log(`👨‍🏫 Teacher Portal:      http://localhost:${PORT}/teacher`);
  console.log(`🎓 Student Portal:      http://localhost:${PORT}/student`);
  console.log(`👨‍👩‍👧 Parent Portal:       http://localhost:${PORT}/parent`);
  console.log('====================================================');
});
