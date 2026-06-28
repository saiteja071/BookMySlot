import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import '../styles/EventDetail.css';

const EventDetail = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [quantity, setQuantity] = useState(1);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingMsg, setBookingMsg] = useState({ type: '', text: '' });

  const [newTotalCapacity, setNewTotalCapacity] = useState('');
  const [formMsg, setFormMsg] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchEventDetails = async () => {
    try {
      const response = await api.get(`/api/events/${id}`);
      setEvent(response.data.event);
      setNewTotalCapacity(response.data.event.total_capacity);
    } catch (err) {
      console.error('Error fetching event details:', err);
      setError(err.response?.data?.message || 'Failed to load event details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  const handleBookTickets = async (e) => {
    e.preventDefault();
    setBookingMsg({ type: '', text: '' });

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setBookingMsg({ type: 'error', text: 'Please enter a valid positive quantity.' });
      return;
    }
    if (qty > event.available_capacity) {
      setBookingMsg({ type: 'error', text: `Only ${event.available_capacity} tickets are available.` });
      return;
    }

    setBookingLoading(true);
    try {
      const response = await api.post('/api/bookings', { event_id: parseInt(id, 10), quantity: qty });
      setBookingMsg({ type: 'success', text: response.data.message || 'Tickets booked successfully!' });
      setQuantity(1);
      await fetchEventDetails();
    } catch (err) {
      console.error('Error booking tickets:', err);
      setBookingMsg({ type: 'error', text: err.response?.data?.message || 'Failed to book tickets.' });
    } finally {
      setBookingLoading(false);
    }
  };

  const handleUpdateCapacity = async (e) => {
    e.preventDefault();
    setFormMsg({ type: '', text: '' });

    const capacityNum = parseInt(newTotalCapacity, 10);
    if (isNaN(capacityNum) || capacityNum <= 0) {
      setFormMsg({ type: 'error', text: 'Total capacity must be a positive integer.' });
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.put(`/api/events/${id}/capacity`, { total_capacity: capacityNum });
      setFormMsg({ type: 'success', text: response.data.message || 'Capacity updated successfully.' });
      await fetchEventDetails();
    } catch (err) {
      console.error('Error updating capacity:', err);
      setFormMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update capacity.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!window.confirm('Are you sure you want to delete this event? This will cancel all confirmed bookings.')) {
      return;
    }
    setSubmitting(true);
    try {
      await api.delete(`/api/events/${id}`);
      navigate('/my-events');
    } catch (err) {
      console.error('Error deleting event:', err);
      setFormMsg({ type: 'error', text: err.response?.data?.message || 'Failed to delete event.' });
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="detail-loading-container"><h3>Loading event details...</h3></div>;
  }

  if (error || !event) {
    return (
      <div className="detail-error-container">
        <Alert severity="error">{error || 'Event not found'}</Alert>
        <Link to="/events" className="back-link">Back to Events</Link>
      </div>
    );
  }

  const isOwner = user && event.organizer_id === user.id;

  return (
    <div className="detail-page-container">
      <div className="detail-back-nav">
        <Link to="/events">← Back to All Events</Link>
      </div>

      <div className="detail-main-layout">
        <div className="event-info-section">
          <div className="event-details-card">
            <h1>{event.title}</h1>
            <div className="event-metadata">
              <p><strong>Venue:</strong> {event.venue}</p>
              <p><strong>Date:</strong> {event.event_date}</p>
              <p><strong>Time:</strong> {event.event_time}</p>
              <p><strong>Organizer:</strong> {event.organizer_name} ({event.organizer_email})</p>
              <p><strong>Price per Ticket:</strong> ₹{Number(event.price).toFixed(2)}</p>
              <p><strong>Available Capacity:</strong> {event.available_capacity} / {event.total_capacity} tickets available</p>
            </div>
            <div className="event-description">
              <h3>Description</h3>
              <p>{event.description || 'No description provided.'}</p>
            </div>
          </div>
        </div>

        <div className="event-action-section">
          {bookingMsg.text && (
            <Alert severity={bookingMsg.type} className="form-alert" onClose={() => setBookingMsg({ type: '', text: '' })}>
              {bookingMsg.text}
            </Alert>
          )}

          {user && user.role === 'user' && (
            <div className="action-card booking-card">
              <h3>Book Tickets</h3>
              <form onSubmit={handleBookTickets} className="action-form">
                <TextField
                  label="Number of Tickets"
                  type="number"
                  inputProps={{ min: 1, max: event.available_capacity }}
                  variant="outlined"
                  fullWidth
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  disabled={bookingLoading || event.available_capacity <= 0}
                  required
                />
                <div className="total-cost-preview">
                  Total Cost: ₹{(Number(event.price) * (parseInt(quantity) || 0)).toFixed(2)}
                </div>
                <Button type="submit" variant="contained" color="primary" fullWidth
                  disabled={bookingLoading || event.available_capacity <= 0} className="action-btn">
                  {event.available_capacity <= 0 ? 'Sold Out' : bookingLoading ? 'Booking...' : 'Book Now'}
                </Button>
              </form>
            </div>
          )}

          {isOwner && (
            <div className="action-card management-card">
              <h3>Manage Event</h3>
              {formMsg.text && (
                <Alert severity={formMsg.type} className="form-alert" onClose={() => setFormMsg({ type: '', text: '' })}>
                  {formMsg.text}
                </Alert>
              )}

              <form onSubmit={handleUpdateCapacity} className="action-form">
                <TextField
                  label="Update Total Capacity"
                  type="number"
                  inputProps={{ min: 1 }}
                  variant="outlined"
                  fullWidth
                  value={newTotalCapacity}
                  onChange={(e) => setNewTotalCapacity(e.target.value)}
                  disabled={submitting}
                  required
                />
                <Button type="submit" variant="contained" color="success" fullWidth
                  disabled={submitting} className="action-btn">
                  {submitting ? 'Updating...' : 'Update Capacity'}
                </Button>
              </form>

              <div className="danger-zone">
                <p className="danger-text">Deleting this event will cancel all confirmed user bookings.</p>
                <Button variant="contained" color="error" fullWidth onClick={handleDeleteEvent}
                  disabled={submitting} className="delete-event-btn">
                  Delete Event
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetail;