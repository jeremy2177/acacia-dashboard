const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { requireAuth } = require('../middleware/auth');

// Apply authentication to all routes
router.use(requireAuth);

router.get('/', statsController.index);

module.exports = router;
