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
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'covered_calls';

  // First, connect without a database select to ensure the database itself exists
  const connection = await mysql.createConnection({ host, port, user, password });
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
  await connection.end();

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

  // Create tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS positions (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      ticker          VARCHAR(10) NOT NULL,
      shares_owned    INT NOT NULL,
      avg_cost_basis  DOUBLE NOT NULL,
      status          VARCHAR(20) DEFAULT 'active',
      opened_at       VARCHAR(20) NOT NULL,
      closed_at       VARCHAR(20),
      notes           TEXT,
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_positions_ticker (ticker),
      INDEX idx_positions_status (status)
    ) ENGINE=InnoDB;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS trades (
      id                        INT AUTO_INCREMENT PRIMARY KEY,
      position_id               INT NOT NULL,
      ticker                    VARCHAR(10) NOT NULL,
      expiration_date           VARCHAR(20) NOT NULL,
      strike_price              DOUBLE NOT NULL,
      contracts                 INT NOT NULL,
      premium_received          DOUBLE NOT NULL,
      open_price                DOUBLE NOT NULL,
      close_price               DOUBLE,
      status                    VARCHAR(20) DEFAULT 'open',
      days_to_expiry            INT,
      iv_at_entry               DOUBLE,
      delta_at_entry            DOUBLE,
      underlying_price_at_entry DOUBLE,
      profit_loss               DOUBLE,
      return_on_capital         DOUBLE,
      annualized_return         DOUBLE,
      opened_at                 VARCHAR(20) NOT NULL,
      closed_at                 VARCHAR(20),
      notes                     TEXT,
      created_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE CASCADE,
      INDEX idx_trades_position_id (position_id),
      INDEX idx_trades_ticker (ticker),
      INDEX idx_trades_status (status),
      INDEX idx_trades_expiration (expiration_date),
      INDEX idx_trades_opened_at (opened_at)
    ) ENGINE=InnoDB;
  `);

  console.log('Database initialized successfully (MySQL)');
}

async function queryAll(sql, params = []) {
  // Convert sqlite standard "?" placeholder mappings to mysql format (which is the same standard "?")
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
