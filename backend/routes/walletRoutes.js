const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const { 
  getWallet, 
  getWalletTransactions, 
  deposit, 
  withdraw 
} = require('../controllers/walletController');

router.get('/', authMiddleware, getWallet);
router.get('/transactions', authMiddleware, getWalletTransactions);
router.post('/deposit', authMiddleware, deposit);
router.post('/withdraw', authMiddleware, withdraw);

module.exports = router;
