import React, { useState, useEffect } from 'react';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import api from '../api/axios';
import '../styles/MyBookings.css';

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchBookings = async () => {
    try {
      const response = await api.get('/bookings/my');
      setBookings(response.data);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Failed to load your bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking? This will refund your money and release tickets.')) {
      return;
    }

    setActionError('');
    setActionSuccess('');
    setActionLoading(bookingId);

    try {
      const response = await api.put(`/bookings/${bookingId}/cancel`);
      setActionSuccess(response.data.message || 'Booking cancelled and refunded successfully.');
      await fetchBookings();
    } catch (err) {
      console.error('Error cancelling booking:', err);
      setActionError(err.response?.data?.message || 'Cancellation failed. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="bookings-loading-container">
        <h3>Loading your bookings...</h3>
      </div>
    );
  }

  return (
    <div className="bookings-page-container">
      <header className="bookings-header">
        <h1>My Bookings</h1>
        <p>View and manage slot bookings for events</p>
      </header>

      {error && <Alert severity="error" className="bookings-alert">{error}</Alert>}
      {actionSuccess && <Alert severity="success" className="bookings-alert" onClose={() => setActionSuccess('')}>{actionSuccess}</Alert>}
      {actionError && <Alert severity="error" className="bookings-alert" onClose={() => setActionError('')}>{actionError}</Alert>}

      {!error && bookings.length === 0 && (
        <div className="no-bookings-box">
          <p>You have not booked any slots yet.</p>
        </div>
      )}

      <div className="bookings-list">
        {bookings.map((booking) => (
          <div key={booking.id} className="booking-card">
            <div className="booking-card-body">
              <div className="booking-main-info">
                <h3 className="booking-title">{booking.event_title}</h3>
                <p className="booking-meta">
                  <span><strong>Venue:</strong> {booking.venue}</span>
                  <span className="separator">|</span>
                  <span><strong>Date:</strong> {booking.event_date}</span>
                  <span className="separator">|</span>
                  <span><strong>Time:</strong> {booking.event_time}</span>
                </p>
                <div className="booking-seat-info">
                  <div className="seat-badge">{booking.quantity} Ticket(s)</div>
                  <div className="price-tag">₹{Number(booking.total_amount).toFixed(2)}</div>
                </div>
              </div>

              <div className="booking-status-box">
                <div className="status-item">
                  <span className="status-label">Booking:</span>
                  <span className={`status-val status-booking-${booking.booking_status.toLowerCase()}`}>
                    {booking.booking_status}
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-label">Payment:</span>
                  <span className={`status-val status-payment-${booking.payment_status.toLowerCase()}`}>
                    {booking.payment_status}
                  </span>
                </div>
              </div>
            </div>

            <div className="booking-card-actions">
              {booking.booking_status === 'Confirmed' && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => handleCancel(booking.id)}
                  disabled={actionLoading !== null}
                  className="cancel-btn"
                >
                  {actionLoading === booking.id ? 'Processing...' : 'Cancel Booking'}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyBookings;
