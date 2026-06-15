const express = require('express');
const router = express.Router();
const Position = require('../models/Position');
const Trade = require('../models/Trade');
const { requireAuth } = require('../middleware/auth');

// Apply authentication to all routes
router.use(requireAuth);

router.get('/export/positions', async (req, res) => {
  try {
    const positions = await Position.getAll();
    let csv = 'ID,Ticker,Shares Owned,Avg Cost Basis,Status,Opened At,Closed At,Notes\n';
    positions.forEach(p => {
      csv += `"${p.id}","${p.ticker}","${p.shares_owned}","${p.avg_cost_basis}","${p.status}","${p.opened_at}","${p.closed_at || ''}","${(p.notes || '').replace(/"/g, '""')}"\n`;
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=positions_export.csv');
    res.status(200).send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/export/trades', async (req, res) => {
  try {
    const trades = await Trade.getAll();
    let csv = 'ID,Position ID,Ticker,Expiration Date,Strike Price,Contracts,Premium Received,Open Price,Close Price,Status,DTE,IV,Delta,Underlying Price,P&L,ROC,Annualized Return,Opened At,Closed At,Notes\n';
    trades.forEach(t => {
      csv += `"${t.id}","${t.position_id}","${t.ticker}","${t.expiration_date}","${t.strike_price}","${t.contracts}","${t.premium_received}","${t.open_price}","${t.close_price || ''}","${t.status}","${t.days_to_expiry || ''}","${t.iv_at_entry || ''}","${t.delta_at_entry || ''}","${t.underlying_price_at_entry || ''}","${t.profit_loss || ''}","${t.return_on_capital || ''}","${t.annualized_return || ''}","${t.opened_at}","${t.closed_at || ''}","${(t.notes || '').replace(/"/g, '""')}"\n`;
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=trades_export.csv');
    res.status(200).send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/trades/:id/assess', async (req, res) => {
  try {
    const { currentUnderlyingPrice, currentOptionPrice } = req.body;
    
    if (!currentUnderlyingPrice || currentOptionPrice === undefined) {
      return res.status(400).json({ 
        error: 'Missing currentUnderlyingPrice or currentOptionPrice' 
      });
    }

    const assessment = await Trade.assessAction(
      parseInt(req.params.id),
      parseFloat(currentUnderlyingPrice),
      parseFloat(currentOptionPrice)
    );

    res.json(assessment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
