import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import api from '../api/axios';
import '../styles/Events.css';

const Events = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await api.get('/api/events');
        setEvents(response.data);
      } catch (err) {
        console.error('Error fetching events:', err);
        setError('Failed to load events. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (loading) {
    return (
      <div className="events-loading-container">
        <h3>Loading events...</h3>
      </div>
    );
  }

  return (
    <div className="events-page-container">
      <header className="events-header">
        <h1>All Events</h1>
        <p>Browse and book slots for upcoming events</p>
      </header>

      {error && <Alert severity="error" className="events-alert">{error}</Alert>}

      {!error && events.length === 0 && (
        <div className="no-events-box">
          <p>No events found. Please check back later!</p>
        </div>
      )}

      <div className="events-grid">
        {events.map((event) => (
          <div key={event.id} className="event-card">
            <div className="event-card-body">
              <h3 className="event-card-title">{event.title}</h3>
              <p className="event-card-desc">
                {event.description 
                  ? (event.description.length > 100 
                      ? `${event.description.substring(0, 100)}...` 
                      : event.description)
                  : 'No description provided.'}
              </p>
              
              <div className="event-card-details">
                <div className="detail-item">
                  <strong>Venue:</strong> {event.venue}
                </div>
                <div className="detail-item">
                  <strong>Date:</strong> {event.event_date}
                </div>
                <div className="detail-item">
                  <strong>Time:</strong> {event.event_time}
                </div>
              </div>
            </div>
            <div className="event-card-footer">
              <Button
                component={Link}
                to={`/events/${event.id}`}
                variant="contained"
                color="primary"
                fullWidth
                className="view-details-btn"
              >
                View Details
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Events;
