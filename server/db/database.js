const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');

let db = null;

function getDb() {
  if (!db) {
    const dbDir = path.dirname(config.DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(config.DB_PATH, {
      // verbose: config.NODE_ENV === 'development' ? console.log : null
    });

    // Enable WAL mode and foreign key constraints
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    initSchema(db);
  }
  return db;
}

function initSchema(database) {
  const schemaPath = path.join(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    database.exec(schemaSql);
  }
}

/**
 * Run a SQL statement with parameters
 */
function run(sql, params = []) {
  const statement = getDb().prepare(sql);
  return statement.run(params);
}

/**
 * Get a single row
 */
function get(sql, params = []) {
  const statement = getDb().prepare(sql);
  return statement.get(params);
}

/**
 * Get all rows
 */
function all(sql, params = []) {
  const statement = getDb().prepare(sql);
  return statement.all(params);
}

/**
 * Execute a transaction
 */
function transaction(fn) {
  const database = getDb();
  const tx = database.transaction(fn);
  return tx();
}

module.exports = {
  getDb,
  run,
  get,
  all,
  transaction
};
