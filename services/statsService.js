const { queryAll, queryOne } = require('../config/database');
const dayjs = require('dayjs');

class StatsService {
  static async getPortfolioSummary() {
    const totalPremium = await queryOne(`
      SELECT COALESCE(SUM(premium_received), 0) as total
      FROM trades
    `);

    const totalPnL = await queryOne(`
      SELECT COALESCE(SUM(profit_loss), 0) as total
      FROM trades WHERE status != 'open'
    `);

    const winRate = await queryOne(`
      SELECT 
        COUNT(CASE WHEN profit_loss > 0 THEN 1 END) as wins,
        COUNT(*) as total
      FROM trades WHERE status != 'open'
    `);

    const openPositions = await queryOne(`
      SELECT COUNT(*) as count FROM positions WHERE status = 'active'
    `);

    const openTrades = await queryOne(`
      SELECT COUNT(*) as count FROM trades WHERE status = 'open'
    `);

    const totalCapitalDeployed = await queryOne(`
      SELECT COALESCE(SUM(strike_price * contracts * 100), 0) as total
      FROM trades WHERE status = 'open'
    `);

    const avgReturn = await queryOne(`
      SELECT COALESCE(AVG(return_on_capital), 0) as avg_roc,
             COALESCE(AVG(annualized_return), 0) as avg_annual
      FROM trades WHERE status != 'open'
    `);

    const monthlyIncome = await queryOne(`
      SELECT COALESCE(SUM(premium_received), 0) as total
      FROM trades
      WHERE opened_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `);

    const avgDaysHeld = await queryOne(`
      SELECT COALESCE(AVG(DATEDIFF(closed_at, opened_at)), 0) as avg_days
      FROM trades WHERE status != 'open' AND closed_at IS NOT NULL
    `);

    const assignmentRate = await queryOne(`
      SELECT 
        COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned,
        COUNT(*) as total
      FROM trades WHERE status != 'open'
    `);

    return {
      totalPremium: totalPremium.total,
      totalPnL: totalPnL.total,
      winRate: winRate.total > 0 ? (winRate.wins / winRate.total * 100) : 0,
      winCount: winRate.wins,
      totalClosedTrades: winRate.total,
      openPositions: openPositions.count,
      openTrades: openTrades.count,
      totalCapitalDeployed: totalCapitalDeployed.total,
      avgReturnPerTrade: avgReturn.avg_roc * 100,
      avgAnnualizedReturn: avgReturn.avg_annual * 100,
      monthlyIncome: monthlyIncome.total,
      avgDaysHeld: Math.round(avgDaysHeld.avg_days),
      assignmentRate: assignmentRate.total > 0
        ? (assignmentRate.assigned / assignmentRate.total * 100) : 0
    };
  }

  static async getMonthlyIncome(months = 12) {
    const rows = await queryAll(`
      SELECT 
        DATE_FORMAT(opened_at, '%Y-%m') as month,
        SUM(premium_received) as total_premium,
        COUNT(*) as trade_count,
        SUM(CASE WHEN status != 'open' THEN profit_loss ELSE 0 END) as net_pnl
      FROM trades
      WHERE opened_at >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      GROUP BY DATE_FORMAT(opened_at, '%Y-%m')
      ORDER BY month ASC
    `, [months]);

    // Fill in missing months
    const result = [];
    const now = dayjs();
    for (let i = months - 1; i >= 0; i--) {
      const monthKey = now.subtract(i, 'month').format('YYYY-MM');
      const existing = rows.find(r => r.month === monthKey);
      result.push({
        month: monthKey,
        label: dayjs(monthKey + '-01').format('MMM YYYY'),
        totalPremium: existing ? parseFloat(existing.total_premium) : 0,
        tradeCount: existing ? existing.trade_count : 0,
        netPnL: existing ? parseFloat(existing.net_pnl) : 0
      });
    }
    return result;
  }

  static async getPositionStats(positionId) {
    const position = await queryOne('SELECT * FROM positions WHERE id = ?', [positionId]);
    if (!position) return null;

    const trades = await queryAll(
      'SELECT * FROM trades WHERE position_id = ? ORDER BY opened_at DESC',
      [positionId]
    );

    const stats = await queryOne(`
      SELECT 
        COALESCE(SUM(premium_received), 0) as total_premium,
        COALESCE(SUM(CASE WHEN status != 'open' THEN profit_loss ELSE 0 END), 0) as realized_pnl,
        COUNT(*) as trade_count,
        COUNT(CASE WHEN status != 'open' AND profit_loss > 0 THEN 1 END) as wins,
        COUNT(CASE WHEN status != 'open' THEN 1 END) as closed_count
      FROM trades WHERE position_id = ?
    `, [positionId]);

    const totalPremiumPerShare = position.shares_owned > 0
      ? stats.total_premium / position.shares_owned : 0;
    const effectiveCostBasis = position.avg_cost_basis - totalPremiumPerShare;
    const yieldOnCost = position.avg_cost_basis > 0
      ? (stats.total_premium / (position.avg_cost_basis * position.shares_owned)) * 100 : 0;

    return {
      position,
      trades,
      totalPremium: stats.total_premium,
      realizedPnL: stats.realized_pnl,
      tradeCount: stats.trade_count,
      winRate: stats.closed_count > 0 ? (stats.wins / stats.closed_count * 100) : 0,
      effectiveCostBasis,
      breakeven: effectiveCostBasis,
      premiumPerShare: totalPremiumPerShare,
      yieldOnCost
    };
  }

  static async getPerformanceMetrics() {
    const bestTrade = await queryOne(`
      SELECT * FROM trades WHERE status != 'open'
      ORDER BY profit_loss DESC LIMIT 1
    `);

    const worstTrade = await queryOne(`
      SELECT * FROM trades WHERE status != 'open'
      ORDER BY profit_loss ASC LIMIT 1
    `);

    const avgDTE = await queryOne(`
      SELECT COALESCE(AVG(days_to_expiry), 0) as avg_dte
      FROM trades
    `);

    const avgIV = await queryOne(`
      SELECT COALESCE(AVG(iv_at_entry), 0) as avg_iv
      FROM trades WHERE iv_at_entry IS NOT NULL
    `);

    // Strike selection analysis
    const strikeAnalysis = await queryAll(`
      SELECT 
        CASE 
          WHEN strike_price < underlying_price_at_entry THEN 'ITM'
          WHEN strike_price = underlying_price_at_entry THEN 'ATM'
          ELSE 'OTM'
        END as moneyness,
        COUNT(*) as count,
        COALESCE(AVG(profit_loss), 0) as avg_pnl,
        COALESCE(AVG(return_on_capital * 100), 0) as avg_roc
      FROM trades
      WHERE underlying_price_at_entry IS NOT NULL
      GROUP BY moneyness
    `);

    // Win/loss streaks
    const allClosed = await queryAll(`
      SELECT profit_loss FROM trades 
      WHERE status != 'open' 
      ORDER BY closed_at ASC
    `);

    let currentWinStreak = 0, maxWinStreak = 0;
    let currentLossStreak = 0, maxLossStreak = 0;
    for (const t of allClosed) {
      if (t.profit_loss > 0) {
        currentWinStreak++;
        currentLossStreak = 0;
        maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
      } else {
        currentLossStreak++;
        currentWinStreak = 0;
        maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
      }
    }

    return {
      bestTrade,
      worstTrade,
      avgDTE: Math.round(avgDTE.avg_dte),
      avgIV: avgIV.avg_iv ? parseFloat(avgIV.avg_iv) : 0,
      strikeAnalysis: strikeAnalysis.map(sa => ({
        ...sa,
        avg_pnl: parseFloat(sa.avg_pnl),
        avg_roc: parseFloat(sa.avg_roc)
      })),
      maxWinStreak,
      maxLossStreak,
      currentWinStreak,
      currentLossStreak
    };
  }

  static async getRiskMetrics() {
    const maxExposure = await queryOne(`
      SELECT COALESCE(SUM(strike_price * contracts * 100), 0) as total
      FROM trades WHERE status = 'open'
    `);

    const concentration = await queryAll(`
      SELECT 
        ticker,
        SUM(strike_price * contracts * 100) as exposure,
        COUNT(*) as trade_count
      FROM trades WHERE status = 'open'
      GROUP BY ticker
      ORDER BY exposure DESC
    `);

    const totalExposure = parseFloat(maxExposure.total) || 1;
    const concentrationWithPct = concentration.map(c => ({
      ...c,
      exposure: parseFloat(c.exposure),
      percentage: (parseFloat(c.exposure) / totalExposure * 100)
    }));

    const assignmentRate = await queryOne(`
      SELECT 
        COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned,
        COUNT(*) as total
      FROM trades WHERE status != 'open'
    `);

    // Monthly P&L for drawdown calculation
    const monthlyPnL = await queryAll(`
      SELECT 
        DATE_FORMAT(closed_at, '%Y-%m') as month,
        SUM(profit_loss) as pnl
      FROM trades 
      WHERE status != 'open' AND closed_at IS NOT NULL
      GROUP BY DATE_FORMAT(closed_at, '%Y-%m')
      ORDER BY month ASC
    `);

    let peak = 0, maxDrawdown = 0, cumulative = 0;
    for (const m of monthlyPnL) {
      cumulative += parseFloat(m.pnl);
      peak = Math.max(peak, cumulative);
      const drawdown = peak - cumulative;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return {
      maxExposure: parseFloat(maxExposure.total),
      concentration: concentrationWithPct,
      assignmentRate: assignmentRate.total > 0
        ? (assignmentRate.assigned / assignmentRate.total * 100) : 0,
      assignedCount: assignmentRate.assigned,
      totalClosedTrades: assignmentRate.total,
      maxDrawdown,
      monthlyPnL: monthlyPnL.map(m => ({ ...m, pnl: parseFloat(m.pnl) }))
    };
  }

  static async getRollingIncome(days = 30) {
    const result = await queryOne(`
      SELECT COALESCE(SUM(premium_received), 0) as total
      FROM trades
      WHERE opened_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    `, [days]);
    return parseFloat(result.total);
  }

  static async getAnnualizedReturnByTicker() {
    const rows = await queryAll(`
      SELECT 
        ticker,
        COUNT(*) as trade_count,
        COALESCE(AVG(annualized_return * 100), 0) as avg_annualized,
        COALESCE(SUM(profit_loss), 0) as total_pnl,
        COALESCE(SUM(premium_received), 0) as total_premium,
        COUNT(CASE WHEN profit_loss > 0 THEN 1 END) as wins,
        COUNT(CASE WHEN status != 'open' THEN 1 END) as closed
      FROM trades
      WHERE status != 'open'
      GROUP BY ticker
      ORDER BY avg_annualized DESC
    `);
    return rows.map(r => ({
      ...r,
      avg_annualized: parseFloat(r.avg_annualized),
      total_pnl: parseFloat(r.total_pnl),
      total_premium: parseFloat(r.total_premium)
    }));
  }

  static async getIncomeByTicker() {
    const rows = await queryAll(`
      SELECT 
        ticker,
        SUM(premium_received) as total_premium,
        COUNT(*) as trade_count,
        SUM(CASE WHEN status != 'open' THEN profit_loss ELSE 0 END) as net_pnl
      FROM trades
      GROUP BY ticker
      ORDER BY total_premium DESC
    `);
    return rows.map(r => ({
      ...r,
      total_premium: parseFloat(r.total_premium),
      net_pnl: parseFloat(r.net_pnl)
    }));
  }
}

module.exports = StatsService;
