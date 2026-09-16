const path = require('path');

module.exports = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'quranora_secure_jwt_secret_key_2026_emerald_gold',
  JWT_EXPIRES_IN: '7d',
  DB_PATH: process.env.DB_PATH || path.join(__dirname, '../../quranora.db'),
  NODE_ENV: process.env.NODE_ENV || 'development'
};
