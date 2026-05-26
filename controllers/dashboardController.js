const StatsService = require('../services/statsService');
const Position = require('../models/Position');
const Trade = require('../models/Trade');

exports.index = async (req, res) => {
  try {
    const summary = await StatsService.getPortfolioSummary();
    const monthlyIncome = await StatsService.getMonthlyIncome(12);
    const openTrades = await Trade.getOpenTrades();
    const recentActivity = await Trade.getRecentActivity(5);
    const openPositions = await Position.getOpenPositions();

    res.render('dashboard', {
      title: 'Dashboard',
      summary,
      monthlyIncome,
      openTrades,
      recentActivity,
      openPositions
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).render('errors/500', { title: 'Error', error: err.message });
  }
};
