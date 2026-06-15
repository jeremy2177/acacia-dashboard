const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authController = require('../controllers/authController');
const { requireAuth, requireGuest } = require('../middleware/auth');

// Auth routes
router.get('/login', requireGuest, authController.login);
router.post('/login', requireGuest, authController.login);
router.get('/logout', authController.logout);

// Protected dashboard route
router.get('/', requireAuth, dashboardController.index);

module.exports = router;
