const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authenticate');
const stockController = require('../controllers/stock_controller');

router.get('/company_stock', stockController.getCompanyStock)
router.get('/market_stock', authenticate, stockController.getMarketStock)
router.get('/user_stock', authenticate, stockController.getUserStock)

module.exports = router;