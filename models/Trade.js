const { queryAll, queryOne, runSql } = require('../config/database');
const dayjs = require('dayjs');

class Trade {
  static async getByPositionId(positionId) {
    return await queryAll(
      'SELECT * FROM trades WHERE position_id = ? ORDER BY opened_at DESC',
      [positionId]
    );
  }

  static async getAll(filters = {}) {
    let sql = 'SELECT t.*, p.shares_owned, p.avg_cost_basis FROM trades t LEFT JOIN positions p ON t.position_id = p.id';
    const conditions = [];
    const params = [];

    if (filters.status && filters.status !== 'all') {
      conditions.push('t.status = ?');
      params.push(filters.status);
    }
    if (filters.ticker) {
      conditions.push('t.ticker = ?');
      params.push(filters.ticker.toUpperCase());
    }
    if (filters.position_id) {
      conditions.push('t.position_id = ?');
      params.push(filters.position_id);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY t.opened_at DESC';
    return await queryAll(sql, params);
  }

  static async getById(id) {
    return await queryOne('SELECT * FROM trades WHERE id = ?', [id]);
  }

  static async getOpenByPositionId(positionId) {
    return await queryAll(
      "SELECT * FROM trades WHERE position_id = ? AND status = 'open' ORDER BY expiration_date ASC",
      [positionId]
    );
  }

  static async create(data) {
    const ticker = data.ticker.toUpperCase().trim();
    const positionId = parseInt(data.position_id);
    const expirationDate = data.expiration_date;
    const strikePrice = parseFloat(data.strike_price);
    const contracts = parseInt(data.contracts);
    const premiumReceived = parseFloat(data.premium_received);
    const openPrice = parseFloat(data.open_price || data.premium_received / (contracts * 100));
    const underlyingPrice = data.underlying_price_at_entry ? parseFloat(data.underlying_price_at_entry) : null;
    const ivAtEntry = data.iv_at_entry ? parseFloat(data.iv_at_entry) : null;
    const deltaAtEntry = data.delta_at_entry ? parseFloat(data.delta_at_entry) : null;
    const openedAt = data.opened_at || dayjs().format('YYYY-MM-DD');
    const notes = data.notes || null;

    // Validation
    if (!ticker) throw new Error('Ticker is required');
    if (!positionId) throw new Error('Position is required');
    if (!expirationDate) throw new Error('Expiration date is required');
    if (!strikePrice || strikePrice <= 0) throw new Error('Strike price must be positive');
    if (!contracts || contracts <= 0) throw new Error('Contracts must be positive');
    if (!premiumReceived || premiumReceived <= 0) throw new Error('Premium must be positive');

    // Calculate DTE
    const dte = dayjs(expirationDate).diff(dayjs(openedAt), 'day');
    if (dte < 0) throw new Error('Expiration date must be in the future');

    // Calculate capital at risk and returns
    const capitalAtRisk = strikePrice * contracts * 100;
    const roc = capitalAtRisk > 0 ? (premiumReceived / capitalAtRisk) : 0;
    const annualizedReturn = dte > 0 ? (roc * (365 / dte)) : 0;

    const result = await runSql(`
      INSERT INTO trades (
        position_id, ticker, expiration_date, strike_price, contracts,
        premium_received, open_price, close_price, status, days_to_expiry,
        iv_at_entry, delta_at_entry, underlying_price_at_entry,
        profit_loss, return_on_capital, annualized_return,
        opened_at, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 'open', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      positionId, ticker, expirationDate, strikePrice, contracts,
      premiumReceived, openPrice, dte,
      ivAtEntry, deltaAtEntry, underlyingPrice,
      premiumReceived, // Initial P&L = full premium
      roc, annualizedReturn,
      openedAt, notes
    ]);

    return result.lastInsertRowid;
  }

  static async close(id, closePrice) {
    const trade = await this.getById(id);
    if (!trade) throw new Error('Trade not found');
    if (trade.status !== 'open') throw new Error('Trade is not open');

    const closePriceNum = parseFloat(closePrice);
    const closeCost = closePriceNum * trade.contracts * 100;
    const pnl = trade.premium_received - closeCost;
    const capitalAtRisk = trade.strike_price * trade.contracts * 100;
    const roc = capitalAtRisk > 0 ? (pnl / capitalAtRisk) : 0;
    const daysHeld = dayjs().diff(dayjs(trade.opened_at), 'day') || 1;
    const annualizedReturn = (roc * (365 / daysHeld));
    const closedAt = dayjs().format('YYYY-MM-DD');

    return await runSql(`
      UPDATE trades SET
        status = 'closed',
        close_price = ?,
        profit_loss = ?,
        return_on_capital = ?,
        annualized_return = ?,
        closed_at = ?
      WHERE id = ?
    `, [closePriceNum, pnl, roc, annualizedReturn, closedAt, id]);
  }

  static async expire(id) {
    const trade = await this.getById(id);
    if (!trade) throw new Error('Trade not found');
    if (trade.status !== 'open') throw new Error('Trade is not open');

    const pnl = trade.premium_received; // Keep full premium
    const capitalAtRisk = trade.strike_price * trade.contracts * 100;
    const roc = capitalAtRisk > 0 ? (pnl / capitalAtRisk) : 0;
    const daysHeld = dayjs(trade.expiration_date).diff(dayjs(trade.opened_at), 'day') || 1;
    const annualizedReturn = (roc * (365 / daysHeld));
    const closedAt = trade.expiration_date;

    return await runSql(`
      UPDATE trades SET
        status = 'expired',
        close_price = 0,
        profit_loss = ?,
        return_on_capital = ?,
        annualized_return = ?,
        closed_at = ?
      WHERE id = ?
    `, [pnl, roc, annualizedReturn, closedAt, id]);
  }

  static async assign(id) {
    const trade = await this.getById(id);
    if (!trade) throw new Error('Trade not found');
    if (trade.status !== 'open') throw new Error('Trade is not open');

    const pnl = trade.premium_received;
    const capitalAtRisk = trade.strike_price * trade.contracts * 100;
    const roc = capitalAtRisk > 0 ? (pnl / capitalAtRisk) : 0;
    const daysHeld = dayjs().diff(dayjs(trade.opened_at), 'day') || 1;
    const annualizedReturn = (roc * (365 / daysHeld));
    const closedAt = dayjs().format('YYYY-MM-DD');

    return await runSql(`
      UPDATE trades SET
        status = 'assigned',
        close_price = 0,
        profit_loss = ?,
        return_on_capital = ?,
        annualized_return = ?,
        closed_at = ?
      WHERE id = ?
    `, [pnl, roc, annualizedReturn, closedAt, id]);
  }

  static async getRecentActivity(limit = 5) {
    const limitValue = Math.max(1, Math.min(parseInt(limit, 10), 1000)); // Validate: 1-1000
    return await queryAll(`
      SELECT t.*, p.shares_owned, p.avg_cost_basis 
      FROM trades t 
      LEFT JOIN positions p ON t.position_id = p.id 
      ORDER BY t.created_at DESC 
      LIMIT ${limitValue}
    `);
  }

  static async getOpenTrades() {
    return await queryAll(`
      SELECT t.*, p.shares_owned, p.avg_cost_basis, p.ticker as pos_ticker
      FROM trades t 
      LEFT JOIN positions p ON t.position_id = p.id 
      WHERE t.status = 'open'
      ORDER BY t.expiration_date ASC
    `);
  }

  /**
   * Assess whether to roll or close a trade based on live market data
   * @param {number} id - Trade ID
   * @param {number} currentUnderlyingPrice - Current underlying stock price
   * @param {number} currentOptionPrice - Current option price (bid to buy back)
   * @returns {Object} Assessment with recommendations
   */
  static async assessAction(id, currentUnderlyingPrice, currentOptionPrice) {
    const trade = await this.getById(id);
    if (!trade) throw new Error('Trade not found');
    
    const dte = dayjs(trade.expiration_date).diff(dayjs(), 'day');
    const premiumReceived = parseFloat(trade.premium_received);
    const strikePrice = parseFloat(trade.strike_price);
    const contracts = parseInt(trade.contracts);
    
    // P&L calculations
    const buybackCost = currentOptionPrice * contracts * 100;
    const currentPnL = premiumReceived - buybackCost;
    const pnlPercent = (currentPnL / premiumReceived) * 100;
    
    // Spread analysis
    const spreadPercent = ((currentUnderlyingPrice - strikePrice) / strikePrice) * 100;
    const isInTheMoney = currentUnderlyingPrice > strikePrice;
    const daysHeld = dayjs().diff(dayjs(trade.opened_at), 'day');

    // ROLL decision: 50-75% P&L hit, DTE < 7, not deep ITM
    const shouldRoll = pnlPercent >= 50 && pnlPercent <= 75 && dte < 7 && spreadPercent < 10;
    const rollReasons = [];
    if (pnlPercent >= 50 && pnlPercent <= 75) rollReasons.push(`Target P&L: ${pnlPercent.toFixed(1)}%`);
    if (dte < 7) rollReasons.push(`DTE critical: ${dte} days`);
    if (spreadPercent < 10) rollReasons.push(`Not deep ITM: ${spreadPercent.toFixed(1)}%`);

    // CLOSE decision: ITM, early exit >25% profit
    const shouldClose = isInTheMoney || (daysHeld <= 30 && pnlPercent >= 25 && dte > 15);
    const closeReasons = [];
    if (isInTheMoney) closeReasons.push(`In-the-money at $${currentUnderlyingPrice.toFixed(2)}`);
    if (daysHeld <= 30 && pnlPercent >= 25 && dte > 15) closeReasons.push(`Early exit: ${pnlPercent.toFixed(1)}% profit`);

    return {
      tradeId: id,
      ticker: trade.ticker,
      currentUnderlyingPrice,
      currentOptionPrice,
      currentPnL: Math.round(currentPnL * 100) / 100,
      pnlPercent: Math.round(pnlPercent * 100) / 100,
      maxProfitPotential: Math.round(premiumReceived * 100) / 100,
      dte,
      daysHeld,
      strikePrice,
      spreadPercent: Math.round(spreadPercent * 100) / 100,
      isInTheMoney,
      shouldRoll,
      rollReasons,
      shouldClose,
      closeReasons,
      recommendedAction: shouldClose ? 'CLOSE' : (shouldRoll ? 'ROLL' : 'HOLD'),
      actionRequired: shouldRoll || shouldClose,
      trade
    };
  }
}

module.exports = Trade;
