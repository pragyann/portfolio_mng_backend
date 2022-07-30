const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authenticate');
const transactionController = require('../controllers/transaction_controller');

router.post('/buy_from_company', authenticate, transactionController.buyFromCompany);
router.post('/add_to_market', authenticate, transactionController.addToMarket);
router.post('/buy_from_market', authenticate, transactionController.buyFromMarket);
router.get('/user_transactions', authenticate, transactionController.getUserTransactions);

module.exports = router;