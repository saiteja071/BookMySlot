import React, { useState, useEffect } from 'react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import api from '../api/axios';
import '../styles/Wallet.css';

const Wallet = () => {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [depositMsg, setDepositMsg] = useState({ type: '', text: '' });
  const [withdrawMsg, setWithdrawMsg] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchTransactions = async () => {
    const response = await api.get('/wallet/transactions');
    setTransactions(response.data);
  };

  const fetchWalletDetails = async () => {
    try {
      const balanceRes = await api.get('/wallet');
      setBalance(Number(balanceRes.data.balance));
      await fetchTransactions();
    } catch (err) {
      console.error('Error fetching wallet info:', err);
      setError('Failed to fetch wallet info. Please reload the page.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletDetails();
  }, []);

  const handleWalletAction = async (e, { endpoint, amount, setAmount, setMsg }) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });

    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      setMsg({ type: 'error', text: 'Please enter a valid positive amount.' });
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post(endpoint, { amount: amt });
      setBalance(Number(response.data.balance));
      setMsg({ type: 'success', text: response.data.message || 'Success!' });
      setAmount('');
      await fetchTransactions();
    } catch (err) {
      console.error(`Error calling ${endpoint}:`, err);
      setMsg({ type: 'error', text: err.response?.data?.message || 'Action failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="wallet-loading-container">
        <h3>Loading your wallet details...</h3>
      </div>
    );
  }

  return (
    <div className="wallet-page-container">
      <header className="wallet-header">
        <h1>My Wallet</h1>
        <p>Deposit, withdraw, and track your transaction history</p>
      </header>

      {error && <Alert severity="error" className="wallet-alert">{error}</Alert>}

      <div className="wallet-overview-section">
        <div className="balance-box">
          <span className="balance-label">Current Balance</span>
          <span className="balance-amount">₹{balance.toFixed(2)}</span>
        </div>
      </div>

      <div className="wallet-forms-layout">
        <div className="wallet-action-card">
          <h3>Add Money to Wallet</h3>
          {depositMsg.text && (
            <Alert severity={depositMsg.type} className="form-alert" onClose={() => setDepositMsg({ type: '', text: '' })}>
              {depositMsg.text}
            </Alert>
          )}
          <form
            onSubmit={(e) => handleWalletAction(e, {
              endpoint: '/wallet/deposit',
              amount: depositAmount,
              setAmount: setDepositAmount,
              setMsg: setDepositMsg
            })}
            className="wallet-action-form"
          >
            <TextField
              label="Amount (₹)"
              type="number"
              inputProps={{ step: '0.01', min: '0.01' }}
              variant="outlined"
              fullWidth
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              disabled={submitting}
              required
            />
            <Button type="submit" variant="contained" color="primary" fullWidth disabled={submitting} className="wallet-btn">
              {submitting ? 'Processing...' : 'Add Money'}
            </Button>
          </form>
        </div>

        <div className="wallet-action-card">
          <h3>Withdraw Money</h3>
          {withdrawMsg.text && (
            <Alert severity={withdrawMsg.type} className="form-alert" onClose={() => setWithdrawMsg({ type: '', text: '' })}>
              {withdrawMsg.text}
            </Alert>
          )}
          <form
            onSubmit={(e) => handleWalletAction(e, {
              endpoint: '/wallet/withdraw',
              amount: withdrawAmount,
              setAmount: setWithdrawAmount,
              setMsg: setWithdrawMsg
            })}
            className="wallet-action-form"
          >
            <TextField
              label="Amount (₹)"
              type="number"
              inputProps={{ step: '0.01', min: '0.01' }}
              variant="outlined"
              fullWidth
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              disabled={submitting}
              required
            />
            <Button type="submit" variant="contained" color="success" fullWidth disabled={submitting} className="wallet-btn">
              {submitting ? 'Processing...' : 'Withdraw'}
            </Button>
          </form>
        </div>
      </div>

      <div className="wallet-transactions-section">
        <h2>Transaction History</h2>
        {transactions.length === 0 ? (
          <div className="no-transactions-box">
            <p>No transactions recorded yet.</p>
          </div>
        ) : (
          <div className="transactions-list">
            <div className="transaction-list-header">
              <span>Date & Time</span>
              <span>Type</span>
              <span>Amount</span>
              <span>Balance After</span>
            </div>
            {transactions.map((tx) => (
              <div key={tx.id} className="transaction-row">
                <span className="tx-date">{tx.created_at}</span>
                <span className={`tx-type tx-type-${tx.type.toLowerCase()}`}>{tx.type}</span>
                <span className={`tx-amount tx-type-${tx.type.toLowerCase()}`}>
                  {tx.type === 'Deposit' || tx.type === 'Refund' || tx.type === 'Earning' ? '+' : '-'}₹{Number(tx.amount).toFixed(2)}
                </span>
                <span className="tx-balance-after">₹{Number(tx.balance_after).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Wallet;