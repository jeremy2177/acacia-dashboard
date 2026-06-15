const bcrypt = require('bcrypt');
const { queryOne, runSql } = require('../config/database');

async function login(req, res) {
  if (req.method === 'GET') {
    return res.render('login', { title: 'Login' });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    req.session.flash = { error: 'Username and password are required' };
    return res.redirect('/login');
  }

  try {
    const user = await queryOne(
      'SELECT id, username, password_hash FROM users WHERE username = ?',
      [username]
    );

    if (!user) {
      req.session.flash = { error: 'Invalid username or password' };
      return res.redirect('/login');
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      req.session.flash = { error: 'Invalid username or password' };
      return res.redirect('/login');
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        req.session.flash = { error: 'Session error' };
        return res.redirect('/login');
      }
      res.redirect('/');
    });
  } catch (err) {
    console.error('Login error:', err);
    req.session.flash = { error: 'An error occurred during login' };
    res.redirect('/login');
  }
}

async function logout(req, res) {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destroy error:', err);
    }
    res.redirect('/login');
  });
}

module.exports = { login, logout };
