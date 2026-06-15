require('dotenv').config();
const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const path = require('path');
const { initDB } = require('./config/database');

const app = express();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session
app.use(session({
  store: new FileStore({
    path: path.join(__dirname, 'data', 'sessions'),
    ttl: 86400 * 7,
    retries: 0,
    logFn: function() {}
  }),
  secret: process.env.SESSION_SECRET || 'default-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

// Flash messages middleware
app.use((req, res, next) => {
  res.locals.flash = req.session.flash || {};
  delete req.session.flash;
  next();
});

// Inject global template locals
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  next();
});

// Auth middleware
const { requireAuth, requireGuest, injectUser } = require('./middleware/auth');
app.use(injectUser);

// Routes
app.use('/', require('./routes/index'));
app.use('/positions', require('./routes/positions'));
app.use('/statistics', require('./routes/statistics'));
app.use('/api', require('./routes/api'));

// 404 handler
app.use((req, res) => {
  res.status(404).render('errors/404', { title: 'Page Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('errors/500', {
    title: 'Server Error',
    error: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// Initialize DB and start server
initDB().then(() => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Dashboard running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

module.exports = app;
