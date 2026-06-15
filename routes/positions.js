const express = require('express');
const router = express.Router();
const positionsController = require('../controllers/positionsController');
const { requireAuth } = require('../middleware/auth');

// Apply authentication to all routes
router.use(requireAuth);

router.get('/', positionsController.index);
router.get('/add', positionsController.showAdd);
router.post('/', positionsController.create);
router.get('/:id', positionsController.detail);
router.get('/:id/edit', positionsController.editPosition);
router.post('/:id/edit', positionsController.updatePosition);
router.post('/:id/delete', positionsController.deletePosition);

router.get('/:id/trades/add', positionsController.showAddTrade);
router.post('/:id/trades', positionsController.createTrade);
router.post('/:id/trades/:tradeId/close', positionsController.closeTrade);
router.post('/:id/trades/:tradeId/expire', positionsController.expireTrade);
router.post('/:id/trades/:tradeId/assign', positionsController.assignTrade);

module.exports = router;
