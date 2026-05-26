const Position = require('../models/Position');
const Trade = require('../models/Trade');
const StatsService = require('../services/statsService');
const dayjs = require('dayjs');

exports.index = async (req, res) => {
  try {
    const filters = {
      status: req.query.status || 'all',
      sort: req.query.sort || 'opened',
      ticker: req.query.ticker || ''
    };

    const positions = await Position.getAll(filters);
    const tickers = await Position.getAllTickers();

    // Enrich positions with trade stats
    const enriched = await Promise.all(positions.map(async (p) => {
      const trades = await Trade.getByPositionId(p.id);
      const openTrades = trades.filter(t => t.status === 'open');
      const closedTrades = trades.filter(t => t.status !== 'open');
      const totalPremium = trades.reduce((sum, t) => sum + parseFloat(t.premium_received), 0);
      const totalPnL = closedTrades.reduce((sum, t) => sum + parseFloat(t.profit_loss || 0), 0);
      const premiumPerShare = p.shares_owned > 0 ? totalPremium / p.shares_owned : 0;

      return {
        ...p,
        trade_count: trades.length,
        open_trade_count: openTrades.length,
        total_premium: totalPremium,
        total_pnl: totalPnL,
        effective_cost_basis: p.avg_cost_basis - premiumPerShare,
        next_expiry: openTrades.length > 0 ? openTrades[0].expiration_date : null,
        days_to_next_expiry: openTrades.length > 0
          ? dayjs(openTrades[0].expiration_date).diff(dayjs(), 'day')
          : null
      };
    }));

    res.render('positions/index', {
      title: 'Positions',
      positions: enriched,
      filters,
      tickers
    });
  } catch (err) {
    console.error('Positions index error:', err);
    res.status(500).render('errors/500', { title: 'Error', error: err.message });
  }
};

exports.showAdd = async (req, res) => {
  res.render('positions/add', {
    title: 'Add Position',
    errors: [],
    data: { opened_at: dayjs().format('YYYY-MM-DD') }
  });
};

exports.create = async (req, res) => {
  try {
    const id = await Position.create(req.body);
    req.session.flash = { success: 'Position created successfully!' };
    res.redirect(`/positions/${id}/trades/add`);
  } catch (err) {
    res.render('positions/add', {
      title: 'Add Position',
      errors: [err.message],
      data: req.body
    });
  }
};

exports.detail = async (req, res) => {
  try {
    const positionStats = await StatsService.getPositionStats(parseInt(req.params.id));
    if (!positionStats) {
      return res.status(404).render('errors/404', { title: 'Not Found' });
    }

    // Monthly P&L for this position
    const monthlyData = [];
    const trades = positionStats.trades;
    const grouped = {};
    trades.forEach(t => {
      const month = dayjs(t.opened_at).format('YYYY-MM');
      if (!grouped[month]) grouped[month] = { premium: 0, pnl: 0 };
      grouped[month].premium += parseFloat(t.premium_received);
      if (t.status !== 'open') grouped[month].pnl += parseFloat(t.profit_loss || 0);
    });
    Object.keys(grouped).sort().forEach(month => {
      monthlyData.push({
        month,
        label: dayjs(month + '-01').format('MMM YY'),
        premium: grouped[month].premium,
        pnl: grouped[month].pnl
      });
    });

    res.render('positions/detail', {
      title: `${positionStats.position.ticker} Position`,
      stats: positionStats,
      monthlyData,
      dayjs
    });
  } catch (err) {
    console.error('Position detail error:', err);
    res.status(500).render('errors/500', { title: 'Error', error: err.message });
  }
};

exports.showAddTrade = async (req, res) => {
  try {
    const position = await Position.getById(parseInt(req.params.id));
    if (!position) {
      return res.status(404).render('errors/404', { title: 'Not Found' });
    }

    res.render('positions/add-trade', {
      title: `Sell Call — ${position.ticker}`,
      position,
      errors: [],
      data: {
        ticker: position.ticker,
        contracts: Math.floor(position.shares_owned / 100),
        opened_at: dayjs().format('YYYY-MM-DD')
      }
    });
  } catch (err) {
    console.error('Add trade error:', err);
    res.status(500).render('errors/500', { title: 'Error', error: err.message });
  }
};

exports.createTrade = async (req, res) => {
  try {
    const position = await Position.getById(parseInt(req.params.id));
    if (!position) {
      return res.status(404).render('errors/404', { title: 'Not Found' });
    }

    const tradeData = {
      ...req.body,
      position_id: position.id,
      ticker: position.ticker
    };

    // Calculate premium_received from open_price if not directly provided
    if (!tradeData.premium_received && tradeData.open_price) {
      tradeData.premium_received = parseFloat(tradeData.open_price) * parseInt(tradeData.contracts) * 100;
    }

    await Trade.create(tradeData);
    req.session.flash = { success: 'Trade logged successfully!' };
    res.redirect(`/positions/${position.id}`);
  } catch (err) {
    const position = await Position.getById(parseInt(req.params.id));
    res.render('positions/add-trade', {
      title: `Sell Call — ${position.ticker}`,
      position,
      errors: [err.message],
      data: req.body
    });
  }
};

exports.closeTrade = async (req, res) => {
  try {
    const trade = await Trade.getById(parseInt(req.params.tradeId));
    if (!trade) {
      return res.status(404).render('errors/404', { title: 'Not Found' });
    }

    await Trade.close(trade.id, req.body.close_price);
    req.session.flash = { success: 'Trade closed successfully!' };
    res.redirect(`/positions/${trade.position_id}`);
  } catch (err) {
    req.session.flash = { error: err.message };
    res.redirect('back');
  }
};

exports.expireTrade = async (req, res) => {
  try {
    const trade = await Trade.getById(parseInt(req.params.tradeId));
    if (!trade) {
      return res.status(404).render('errors/404', { title: 'Not Found' });
    }

    await Trade.expire(trade.id);
    req.session.flash = { success: 'Trade marked as expired!' };
    res.redirect(`/positions/${trade.position_id}`);
  } catch (err) {
    req.session.flash = { error: err.message };
    res.redirect('back');
  }
};

exports.assignTrade = async (req, res) => {
  try {
    const trade = await Trade.getById(parseInt(req.params.tradeId));
    if (!trade) {
      return res.status(404).render('errors/404', { title: 'Not Found' });
    }

    await Trade.assign(trade.id);

    // Update position status
    await Position.update(trade.position_id, {
      status: 'assigned',
      closed_at: dayjs().format('YYYY-MM-DD')
    });

    req.session.flash = { success: 'Trade marked as assigned! Position status updated.' };
    res.redirect(`/positions/${trade.position_id}`);
  } catch (err) {
    req.session.flash = { error: err.message };
    res.redirect('back');
  }
};

exports.editPosition = async (req, res) => {
  try {
    const position = await Position.getById(parseInt(req.params.id));
    if (!position) {
      return res.status(404).render('errors/404', { title: 'Not Found' });
    }
    res.render('positions/edit', {
      title: `Edit ${position.ticker}`,
      position,
      errors: []
    });
  } catch (err) {
    res.status(500).render('errors/500', { title: 'Error', error: err.message });
  }
};

exports.updatePosition = async (req, res) => {
  try {
    await Position.update(parseInt(req.params.id), req.body);
    req.session.flash = { success: 'Position updated!' };
    res.redirect(`/positions/${req.params.id}`);
  } catch (err) {
    const position = await Position.getById(parseInt(req.params.id));
    res.render('positions/edit', {
      title: `Edit ${position.ticker}`,
      position: { ...position, ...req.body },
      errors: [err.message]
    });
  }
};

exports.deletePosition = async (req, res) => {
  try {
    await Position.delete(parseInt(req.params.id));
    req.session.flash = { success: 'Position deleted!' };
    res.redirect('/positions');
  } catch (err) {
    req.session.flash = { error: err.message };
    res.redirect('back');
  }
};
