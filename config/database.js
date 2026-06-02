const mysql = require('mysql2/promise');

let pool = null;

function getPool() {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initDB() first.');
  }
  return pool;
}

async function initDB() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '3306');
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || 'jeremymysql';
  const database = process.env.DB_NAME || 'covered_calls';

  // Initialize pool
  pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  // Verify connection
  await pool.query('SELECT 1');

  console.log('Database initialized successfully (MySQL)');
}

async function queryAll(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function queryOne(sql, params = []) {
  const rows = await queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

async function runSql(sql, params = []) {
  const [result] = await pool.execute(sql, params);
  return {
    lastInsertRowid: result.insertId,
    changes: result.affectedRows
  };
}

module.exports = { initDB, getPool, queryAll, queryOne, runSql };
