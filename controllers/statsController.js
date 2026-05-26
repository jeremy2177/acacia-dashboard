const StatsService = require('../services/statsService');

exports.index = async (req, res) => {
  try {
    const summary = await StatsService.getPortfolioSummary();
    const monthlyIncome = await StatsService.getMonthlyIncome(12);
    const performance = await StatsService.getPerformanceMetrics();
    const risk = await StatsService.getRiskMetrics();
    const annualizedTicker = await StatsService.getAnnualizedReturnByTicker();
    const incomeTicker = await StatsService.getIncomeByTicker();
    
    // Add sliding windows
    const rolling30 = await StatsService.getRollingIncome(30);
    const rolling60 = await StatsService.getRollingIncome(60);
    const rolling90 = await StatsService.getRollingIncome(90);

    res.render('statistics', {
      title: 'Statistics Deep Dive',
      summary,
      monthlyIncome,
      performance,
      risk,
      annualizedTicker,
      incomeTicker,
      rolling: {
        r30: rolling30,
        r60: rolling60,
        r90: rolling90
      }
    });
  } catch (err) {
    console.error('Stats page error:', err);
    res.status(500).render('errors/500', { title: 'Error', error: err.message });
  }
};
