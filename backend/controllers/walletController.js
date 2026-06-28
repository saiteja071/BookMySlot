const { getPool } = require('../config/db');

const getWallet = async (req, res) => {
  const user_id = req.user.id;
  try {
    const pool = getPool();
    const [users] = await pool.query('SELECT balance FROM users WHERE id = ?', [user_id]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json({ balance: Number(users[0].balance) });
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return res.status(500).json({ message: 'Server error while fetching wallet balance' });
  }
};

const getWalletTransactions = async (req, res) => {
  const user_id = req.user.id;
  try {
    const pool = getPool();
    const [transactions] = await pool.query(
      'SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC',
      [user_id]
    );
    return res.json(transactions);
  } catch (error) {
    console.error('Error fetching wallet transactions:', error);
    return res.status(500).json({ message: 'Server error while fetching wallet history' });
  }
};



const applyWalletChange = async (req, res, { type, direction }) => {
  const { amount } = req.body;
  const user_id = req.user.id;

  const amt = Number(amount);
  if (isNaN(amt) || amt <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number' });
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [users] = await connection.query(
      'SELECT balance FROM users WHERE id = ? FOR UPDATE',
      [user_id]
    );
    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'User not found' });
    }

    const currentBalance = Number(users[0].balance);
    if (direction === -1 && currentBalance < amt) {
      await connection.rollback();
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    const newBalance = currentBalance + direction * amt;

    await connection.query('UPDATE users SET balance = ? WHERE id = ?', [newBalance, user_id]);
    await connection.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, balance_after)
       VALUES (?, ?, ?, ?)`,
      [user_id, type, amt, newBalance]
    );

    await connection.commit();
    return res.json({ message: `${type} successful`, balance: newBalance });
  } catch (error) {
    console.error(`Error during ${type} transaction:`, error);
    await connection.rollback();
    return res.status(500).json({ message: `Server error during ${type.toLowerCase()}` });
  } finally {
    connection.release();
  }
};

const deposit = (req, res) => applyWalletChange(req, res, { type: 'Deposit', direction: 1 });
const withdraw = (req, res) => applyWalletChange(req, res, { type: 'Withdraw', direction: -1 });

module.exports = {
  getWallet,
  getWalletTransactions,
  deposit,
  withdraw
};