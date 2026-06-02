const { initDB, runSql } = require('../config/database');
const Position = require('../models/Position');
const Trade = require('../models/Trade');
const dayjs = require('dayjs');

async function seed() {
  console.log('Starting developer database seeding for MySQL...');
  
  try {
    // Ensure DB is initialized
    await initDB();
    console.log('Make sure sql/schema.sql has been applied before seeding.');
    
    // Wipe existing data
    await runSql('DELETE FROM trades;');
    await runSql('DELETE FROM positions;');
    console.log('Wiped existing trades and positions successfully.');

    const now = dayjs();
    
    // Create 7 beautiful historical positions
    const posData = [
      { ticker: 'AAPL', shares_owned: 200, avg_cost_basis: 150.00, opened_at: now.subtract(180, 'day').format('YYYY-MM-DD'), notes: 'Long term Apple growth position.' },
      { ticker: 'MSFT', shares_owned: 100, avg_cost_basis: 280.00, opened_at: now.subtract(150, 'day').format('YYYY-MM-DD'), notes: 'Core software holdings.' },
      { ticker: 'TSLA', shares_owned: 300, avg_cost_basis: 220.00, opened_at: now.subtract(120, 'day').format('YYYY-MM-DD'), notes: 'High volatility yield harvest ticker.' },
      { ticker: 'NVDA', shares_owned: 100, avg_cost_basis: 420.00, opened_at: now.subtract(90, 'day').format('YYYY-MM-DD'), notes: 'AI leader, selling premium.' },
      { ticker: 'AMD', shares_owned: 200, avg_cost_basis: 110.00, opened_at: now.subtract(60, 'day').format('YYYY-MM-DD'), notes: 'Semiconductor asset hedge.' },
      { ticker: 'SPY', shares_owned: 100, avg_cost_basis: 450.00, opened_at: now.subtract(30, 'day').format('YYYY-MM-DD'), notes: 'Index tracking for steady passive premium.' },
      { ticker: 'QQQ', shares_owned: 100, avg_cost_basis: 360.00, opened_at: now.subtract(20, 'day').format('YYYY-MM-DD'), notes: 'Nasdaq tech index holdings.' }
    ];

    const posIds = {};
    for (const p of posData) {
      const id = await Position.create(p);
      posIds[p.ticker] = id;
    }
    console.log(`Created ${Object.keys(posIds).length} stock underlying positions.`);

    // Log Trades (with varied statuses: open, closed, expired, assigned)
    const trades = [
      // AAPL Trades (Multiple rolls, sequential history)
      {
        position_id: posIds['AAPL'],
        ticker: 'AAPL',
        opened_at: now.subtract(170, 'day').format('YYYY-MM-DD'),
        expiration_date: now.subtract(140, 'day').format('YYYY-MM-DD'),
        strike_price: 155.00,
        contracts: 2,
        premium_received: 520.00, // $2.60 per share
        open_price: 2.60,
        underlying_price_at_entry: 149.50,
        iv_at_entry: 28.5,
        delta_at_entry: 0.32,
        notes: 'First AAPL monthly call sale. Let expire.',
        action: 'expire'
      },
      {
        position_id: posIds['AAPL'],
        ticker: 'AAPL',
        opened_at: now.subtract(135, 'day').format('YYYY-MM-DD'),
        expiration_date: now.subtract(105, 'day').format('YYYY-MM-DD'),
        strike_price: 160.00,
        contracts: 2,
        premium_received: 480.00, // $2.40 per share
        open_price: 2.40,
        underlying_price_at_entry: 154.20,
        iv_at_entry: 26.2,
        delta_at_entry: 0.28,
        notes: 'AAPL monthly roll. Buy back early to lock profits.',
        action: 'close',
        close_price: 0.30
      },
      {
        position_id: posIds['AAPL'],
        ticker: 'AAPL',
        opened_at: now.subtract(100, 'day').format('YYYY-MM-DD'),
        expiration_date: now.subtract(70, 'day').format('YYYY-MM-DD'),
        strike_price: 162.50,
        contracts: 2,
        premium_received: 580.00, // $2.90 per share
        open_price: 2.90,
        underlying_price_at_entry: 157.00,
        iv_at_entry: 30.1,
        delta_at_entry: 0.35,
        notes: 'Pre-earnings premium surge sale. Expired OTM.',
        action: 'expire'
      },
      {
        position_id: posIds['AAPL'],
        ticker: 'AAPL',
        opened_at: now.subtract(65, 'day').format('YYYY-MM-DD'),
        expiration_date: now.subtract(35, 'day').format('YYYY-MM-DD'),
        strike_price: 165.00,
        contracts: 2,
        premium_received: 390.00, // $1.95 per share
        open_price: 1.95,
        underlying_price_at_entry: 161.10,
        iv_at_entry: 22.4,
        delta_at_entry: 0.25,
        notes: 'Post-earnings low IV. Expired OTM.',
        action: 'expire'
      },
      {
        position_id: posIds['AAPL'],
        ticker: 'AAPL',
        opened_at: now.subtract(30, 'day').format('YYYY-MM-DD'),
        expiration_date: now.add(5, 'day').format('YYYY-MM-DD'),
        strike_price: 170.00,
        contracts: 2,
        premium_received: 420.00, // $2.10 per share
        open_price: 2.10,
        underlying_price_at_entry: 166.50,
        iv_at_entry: 25.0,
        delta_at_entry: 0.30,
        notes: 'Active Apple June premium cycle.',
        action: 'open'
      },

      // MSFT Trades
      {
        position_id: posIds['MSFT'],
        ticker: 'MSFT',
        opened_at: now.subtract(140, 'day').format('YYYY-MM-DD'),
        expiration_date: now.subtract(110, 'day').format('YYYY-MM-DD'),
        strike_price: 295.00,
        contracts: 1,
        premium_received: 680.00, // $6.80 per share
        open_price: 6.80,
        underlying_price_at_entry: 284.10,
        iv_at_entry: 24.1,
        delta_at_entry: 0.30,
        notes: 'Conservative out-of-the-money harvest. Let expire.',
        action: 'expire'
      },
      {
        position_id: posIds['MSFT'],
        ticker: 'MSFT',
        opened_at: now.subtract(105, 'day').format('YYYY-MM-DD'),
        expiration_date: now.subtract(75, 'day').format('YYYY-MM-DD'),
        strike_price: 300.00,
        contracts: 1,
        premium_received: 520.00, // $5.20 per share
        open_price: 5.20,
        underlying_price_at_entry: 289.40,
        iv_at_entry: 22.0,
        delta_at_entry: 0.28,
        notes: 'Steady income target strike. Expired OTM.',
        action: 'expire'
      },
      {
        position_id: posIds['MSFT'],
        ticker: 'MSFT',
        opened_at: now.subtract(70, 'day').format('YYYY-MM-DD'),
        expiration_date: now.subtract(40, 'day').format('YYYY-MM-DD'),
        strike_price: 310.00,
        contracts: 1,
        premium_received: 740.00, // $7.40 per share
        open_price: 7.40,
        underlying_price_at_entry: 298.50,
        iv_at_entry: 26.5,
        delta_at_entry: 0.34,
        notes: 'Price spike. Buying back to prevent potential assignment.',
        action: 'close',
        close_price: 1.50
      },
      {
        position_id: posIds['MSFT'],
        ticker: 'MSFT',
        opened_at: now.subtract(35, 'day').format('YYYY-MM-DD'),
        expiration_date: now.add(10, 'day').format('YYYY-MM-DD'),
        strike_price: 320.00,
        contracts: 1,
        premium_received: 610.00, // $6.10 per share
        open_price: 6.10,
        underlying_price_at_entry: 309.20,
        iv_at_entry: 23.4,
        delta_at_entry: 0.29,
        notes: 'Open active MSFT premium collection.',
        action: 'open'
      },

      // TSLA Trades
      {
        position_id: posIds['TSLA'],
        ticker: 'TSLA',
        opened_at: now.subtract(110, 'day').format('YYYY-MM-DD'),
        expiration_date: now.subtract(80, 'day').format('YYYY-MM-DD'),
        strike_price: 230.00,
        contracts: 3,
        premium_received: 3450.00, // $11.50 per share
        open_price: 11.50,
        underlying_price_at_entry: 215.40,
        iv_at_entry: 58.6,
        delta_at_entry: 0.36,
        notes: 'Heavy earnings premium. Expired fully out of the money.',
        action: 'expire'
      },
      {
        position_id: posIds['TSLA'],
        ticker: 'TSLA',
        opened_at: now.subtract(75, 'day').format('YYYY-MM-DD'),
        expiration_date: now.subtract(45, 'day').format('YYYY-MM-DD'),
        strike_price: 240.00,
        contracts: 3,
        premium_received: 2850.00, // $9.50 per share
        open_price: 9.50,
        underlying_price_at_entry: 228.10,
        iv_at_entry: 52.0,
        delta_at_entry: 0.32,
        notes: 'Sudden stock price breakout. Buying back at a loss to protect position.',
        action: 'close',
        close_price: 15.50
      },
      {
        position_id: posIds['TSLA'],
        ticker: 'TSLA',
        opened_at: now.subtract(40, 'day').format('YYYY-MM-DD'),
        expiration_date: now.subtract(10, 'day').format('YYYY-MM-DD'),
        strike_price: 245.00,
        contracts: 3,
        premium_received: 3300.00, // $11.00 per share
        open_price: 11.00,
        underlying_price_at_entry: 232.00,
        iv_at_entry: 55.4,
        delta_at_entry: 0.35,
        notes: 'Price hit strike. Option assigned, closing underlying shares.',
        action: 'assign'
      },

      // NVDA
      {
        position_id: posIds['NVDA'],
        ticker: 'NVDA',
        opened_at: now.subtract(80, 'day').format('YYYY-MM-DD'),
        expiration_date: now.subtract(50, 'day').format('YYYY-MM-DD'),
        strike_price: 440.00,
        contracts: 1,
        premium_received: 1850.00, // $18.50 per share
        open_price: 18.50,
        underlying_price_at_entry: 412.00,
        iv_at_entry: 42.1,
        delta_at_entry: 0.30,
        notes: 'High premium write. Expired OTM.',
        action: 'expire'
      },
      {
        position_id: posIds['NVDA'],
        ticker: 'NVDA',
        opened_at: now.subtract(45, 'day').format('YYYY-MM-DD'),
        expiration_date: now.subtract(15, 'day').format('YYYY-MM-DD'),
        strike_price: 460.00,
        contracts: 1,
        premium_received: 1620.00, // $16.20 per share
        open_price: 16.20,
        underlying_price_at_entry: 435.50,
        iv_at_entry: 38.4,
        delta_at_entry: 0.28,
        notes: 'Securing profits early at 80% decay.',
        action: 'close',
        close_price: 3.20
      },
      {
        position_id: posIds['NVDA'],
        ticker: 'NVDA',
        opened_at: now.subtract(10, 'day').format('YYYY-MM-DD'),
        expiration_date: now.add(20, 'day').format('YYYY-MM-DD'),
        strike_price: 480.00,
        contracts: 1,
        premium_received: 2150.00, // $21.50 per share
        open_price: 21.50,
        underlying_price_at_entry: 452.10,
        iv_at_entry: 45.0,
        delta_at_entry: 0.33,
        notes: 'Active NVDA position.',
        action: 'open'
      },

      // AMD
      {
        position_id: posIds['AMD'],
        ticker: 'AMD',
        opened_at: now.subtract(50, 'day').format('YYYY-MM-DD'),
        expiration_date: now.subtract(20, 'day').format('YYYY-MM-DD'),
        strike_price: 120.00,
        contracts: 2,
        premium_received: 940.00, // $4.70 per share
        open_price: 4.70,
        underlying_price_at_entry: 108.50,
        iv_at_entry: 36.2,
        delta_at_entry: 0.29,
        notes: 'Expired OTM comfortably.',
        action: 'expire'
      },
      {
        position_id: posIds['AMD'],
        ticker: 'AMD',
        opened_at: now.subtract(15, 'day').format('YYYY-MM-DD'),
        expiration_date: now.add(15, 'day').format('YYYY-MM-DD'),
        strike_price: 125.00,
        contracts: 2,
        premium_received: 860.00, // $4.30 per share
        open_price: 4.30,
        underlying_price_at_entry: 114.20,
        iv_at_entry: 33.5,
        delta_at_entry: 0.27,
        notes: 'AMD active monthly.',
        action: 'open'
      },

      // SPY
      {
        position_id: posIds['SPY'],
        ticker: 'SPY',
        opened_at: now.subtract(25, 'day').format('YYYY-MM-DD'),
        expiration_date: now.add(5, 'day').format('YYYY-MM-DD'),
        strike_price: 460.00,
        contracts: 1,
        premium_received: 380.00, // $3.80 per share
        open_price: 3.80,
        underlying_price_at_entry: 450.20,
        iv_at_entry: 14.5,
        delta_at_entry: 0.24,
        notes: 'Index tracking steady monthly cash flow.',
        action: 'open'
      },

      // QQQ
      {
        position_id: posIds['QQQ'],
        ticker: 'QQQ',
        opened_at: now.subtract(18, 'day').format('YYYY-MM-DD'),
        expiration_date: now.add(12, 'day').format('YYYY-MM-DD'),
        strike_price: 375.00,
        contracts: 1,
        premium_received: 550.00, // $5.50 per share
        open_price: 5.50,
        underlying_price_at_entry: 361.50,
        iv_at_entry: 18.2,
        delta_at_entry: 0.26,
        notes: 'Active QQQ monthly call writing.',
        action: 'open'
      }
    ];

    let seedCount = 0;
    for (const t of trades) {
      const tradeId = await Trade.create(t);
      seedCount++;
      
      // Perform actions (close, expire, assign) dynamically to simulate full cycle calculations
      if (t.action === 'close') {
        await Trade.close(tradeId, t.close_price);
      } else if (t.action === 'expire') {
        await Trade.expire(tradeId);
      } else if (t.action === 'assign') {
        await Trade.assign(tradeId);
        // Force update of position status
        await Position.update(t.position_id, {
          status: 'assigned',
          closed_at: now.subtract(10, 'day').format('YYYY-MM-DD')
        });
      }
    }
    
    console.log(`Successfully seeded ${seedCount} options trades on MySQL with complete lifecycle calculations.`);
    process.exit(0);
  } catch (err) {
    console.error('Failed database seeding on MySQL:', err);
    process.exit(1);
  }
}

seed();
