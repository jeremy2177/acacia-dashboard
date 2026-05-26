const { queryAll, queryOne, runSql } = require('../config/database');

class Position {
  static async getAll(filters = {}) {
    let sql = 'SELECT * FROM positions';
    const conditions = [];
    const params = [];

    if (filters.status && filters.status !== 'all') {
      conditions.push('status = ?');
      params.push(filters.status);
    }

    if (filters.ticker) {
      conditions.push('ticker = ?');
      params.push(filters.ticker.toUpperCase());
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    // Sort
    const sortMap = {
      'ticker': 'ticker ASC',
      'opened': 'opened_at DESC',
      'status': 'status ASC',
      'cost': 'avg_cost_basis DESC'
    };
    const sort = sortMap[filters.sort] || 'created_at DESC';
    sql += ` ORDER BY ${sort}`;

    return await queryAll(sql, params);
  }

  static async getById(id) {
    return await queryOne('SELECT * FROM positions WHERE id = ?', [id]);
  }

  static async getWithStats(id) {
    const position = await this.getById(id);
    if (!position) return null;

    // Get trade aggregates
    const stats = await queryOne(`
      SELECT 
        COUNT(*) as trade_count,
        COALESCE(SUM(premium_received), 0) as total_premium,
        COALESCE(SUM(CASE WHEN status != 'open' THEN profit_loss ELSE 0 END), 0) as total_pnl,
        COUNT(CASE WHEN status != 'open' AND profit_loss > 0 THEN 1 END) as winning_trades,
        COUNT(CASE WHEN status != 'open' THEN 1 END) as closed_trades
      FROM trades WHERE position_id = ?
    `, [id]);

    const totalPremiumPerShare = position.shares_owned > 0
      ? stats.total_premium / position.shares_owned
      : 0;

    return {
      ...position,
      trade_count: stats.trade_count,
      total_premium: stats.total_premium,
      total_pnl: stats.total_pnl,
      effective_cost_basis: position.avg_cost_basis - totalPremiumPerShare,
      breakeven: position.avg_cost_basis - totalPremiumPerShare,
      win_rate: stats.closed_trades > 0
        ? (stats.winning_trades / stats.closed_trades * 100)
        : 0,
      premium_per_share: totalPremiumPerShare
    };
  }

  static async create(data) {
    const ticker = data.ticker.toUpperCase().trim();
    const shares = parseInt(data.shares_owned);
    const costBasis = parseFloat(data.avg_cost_basis);
    const openedAt = data.opened_at;
    const notes = data.notes || null;

    // Validation
    if (!ticker) throw new Error('Ticker symbol is required');
    if (!shares || shares <= 0) throw new Error('Shares must be a positive number');
    if (shares % 100 !== 0) throw new Error('Shares must be a multiple of 100');
    if (!costBasis || costBasis <= 0) throw new Error('Cost basis must be positive');
    if (!openedAt) throw new Error('Open date is required');

    const result = await runSql(`
      INSERT INTO positions (ticker, shares_owned, avg_cost_basis, status, opened_at, notes)
      VALUES (?, ?, ?, 'active', ?, ?)
    `, [ticker, shares, costBasis, openedAt, notes]);

    return result.lastInsertRowid;
  }

  static async update(id, data) {
    const fields = [];
    const params = [];

    if (data.ticker !== undefined) {
      fields.push('ticker = ?');
      params.push(data.ticker.toUpperCase().trim());
    }
    if (data.shares_owned !== undefined) {
      const shares = parseInt(data.shares_owned);
      if (shares % 100 !== 0) throw new Error('Shares must be a multiple of 100');
      fields.push('shares_owned = ?');
      params.push(shares);
    }
    if (data.avg_cost_basis !== undefined) {
      fields.push('avg_cost_basis = ?');
      params.push(parseFloat(data.avg_cost_basis));
    }
    if (data.status !== undefined) {
      fields.push('status = ?');
      params.push(data.status);
    }
    if (data.closed_at !== undefined) {
      fields.push('closed_at = ?');
      params.push(data.closed_at);
    }
    if (data.notes !== undefined) {
      fields.push('notes = ?');
      params.push(data.notes);
    }

    params.push(id);

    return await runSql(`UPDATE positions SET ${fields.join(', ')} WHERE id = ?`, params);
  }

  static async delete(id) {
    await runSql('DELETE FROM trades WHERE position_id = ?', [id]);
    return await runSql('DELETE FROM positions WHERE id = ?', [id]);
  }

  static async getAllTickers() {
    return await queryAll('SELECT DISTINCT ticker FROM positions ORDER BY ticker ASC');
  }

  static async getOpenPositions() {
    return await queryAll(`
      SELECT p.*, 
        (SELECT COUNT(*) FROM trades t WHERE t.position_id = p.id AND t.status = 'open') as open_trades,
        (SELECT COALESCE(SUM(premium_received), 0) FROM trades t WHERE t.position_id = p.id) as total_premium
      FROM positions p 
      WHERE p.status = 'active' 
      ORDER BY p.ticker ASC
    `);
  }
}

module.exports = Position;
