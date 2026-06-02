CREATE DATABASE IF NOT EXISTS covered_calls;
USE covered_calls;

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
