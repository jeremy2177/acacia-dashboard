// Middleware to check if user is authenticated
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
}

// Middleware to check if user is NOT authenticated (for login page)
function requireGuest(req, res, next) {
  if (req.session.userId) {
    return res.redirect('/');
  }
  next();
}

// Inject user info into response locals
function injectUser(req, res, next) {
  res.locals.user = req.session.userId ? { id: req.session.userId, username: req.session.username } : null;
  next();
}

module.exports = { requireAuth, requireGuest, injectUser };
