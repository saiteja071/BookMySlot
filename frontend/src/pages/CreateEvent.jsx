import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import api from '../api/axios';
import '../styles/CreateEvent.css';

const initialForm = { title: '', description: '', venue: '', date: '', time: '', price: '', totalCapacity: '' };

const CreateEvent = () => {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const { title, description, venue, date, time, price, totalCapacity } = form;

    if (!title.trim() || !venue.trim() || !date || !time || !price || !totalCapacity) {
      setError('Please fill in all required fields (Title, Venue, Date, Time, Price, Total Capacity)');
      return;
    }

    const priceNum = Number(price);
    const capacityNum = parseInt(totalCapacity, 10);

    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Price must be a positive number');
      return;
    }
    if (isNaN(capacityNum) || capacityNum <= 0) {
      setError('Total capacity must be a positive integer');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/api/events', {
        title: title.trim(),
        description: description.trim(),
        venue: venue.trim(),
        event_date: date,
        event_time: time,
        price: priceNum,
        total_capacity: capacityNum
      });
      setSuccess('Event created successfully! Redirecting...');
      setTimeout(() => navigate(`/events/${response.data.eventId}`), 1500);
    } catch (err) {
      console.error('Error creating event:', err);
      setError(err.response?.data?.message || 'Failed to create event. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="create-event-container">
      <div className="create-event-card">
        <h2>Create Event</h2>
        <p className="create-event-subtitle">Create a new capacity-based event (Organizer Only)</p>

        {error && <Alert severity="error" className="create-event-alert">{error}</Alert>}
        {success && <Alert severity="success" className="create-event-alert">{success}</Alert>}

        <form onSubmit={handleSubmit} className="create-event-form">
          <div className="form-group">
            <TextField label="Event Title" variant="outlined" fullWidth value={form.title}
              onChange={handleChange('title')} disabled={submitting} required />
          </div>

          <div className="form-group">
            <TextField label="Description" variant="outlined" multiline rows={3} fullWidth
              value={form.description} onChange={handleChange('description')} disabled={submitting} />
          </div>

          <div className="form-group">
            <TextField label="Venue" variant="outlined" fullWidth value={form.venue}
              onChange={handleChange('venue')} disabled={submitting} required />
          </div>

          <div className="form-row">
            <div className="form-group half-width">
              <label className="plain-field-label">Date *</label>
              <TextField type="date" variant="outlined" fullWidth value={form.date}
                onChange={handleChange('date')} disabled={submitting} required />
            </div>
            <div className="form-group half-width">
              <label className="plain-field-label">Time *</label>
              <TextField type="time" variant="outlined" fullWidth value={form.time}
                onChange={handleChange('time')} disabled={submitting} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group half-width">
              <TextField label="Price (₹)" type="number" inputProps={{ step: '0.01', min: '0.01' }}
                variant="outlined" fullWidth value={form.price} onChange={handleChange('price')}
                disabled={submitting} required />
            </div>
            <div className="form-group half-width">
              <TextField label="Total Capacity" type="number" inputProps={{ min: '1' }}
                variant="outlined" fullWidth value={form.totalCapacity} onChange={handleChange('totalCapacity')}
                disabled={submitting} required />
            </div>
          </div>

          <Button type="submit" variant="contained" color="primary" fullWidth size="large"
            disabled={submitting} className="submit-event-btn">
            {submitting ? 'Creating...' : 'Create Event'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default CreateEvent;