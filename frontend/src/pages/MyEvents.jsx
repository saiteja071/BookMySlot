import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import api from '../api/axios';
import '../styles/MyEvents.css';

const MyEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMyEvents = async () => {
      try {
        const response = await api.get('/events/my/events');
        setEvents(response.data);
      } catch (err) {
        console.error('Error fetching organizer events:', err);
        setError('Failed to load your events. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchMyEvents();
  }, []);

  if (loading) {
    return (
      <div className="my-events-loading-container">
        <h3>Loading your events...</h3>
      </div>
    );
  }

  return (
    <div className="my-events-page-container">
      <header className="my-events-header">
        <div className="header-title-row">
          <h1>My Events</h1>
          <Button
            component={Link}
            to="/events/create"
            variant="contained"
            color="primary"
            className="create-btn"
          >
            Create New Event
          </Button>
        </div>
        <p>Manage and configure capacity for events you have created</p>
      </header>

      {error && <Alert severity="error" className="my-events-alert">{error}</Alert>}

      {!error && events.length === 0 && (
        <div className="no-my-events-box">
          <p>You haven't created any events yet.</p>
          <Button
            component={Link}
            to="/events/create"
            variant="outlined"
            color="primary"
            className="create-now-btn"
          >
            Create Event Now
          </Button>
        </div>
      )}

      <div className="my-events-list">
        {events.map((event) => (
          <div key={event.id} className="my-event-row">
            <div className="my-event-info">
              <h3>{event.title}</h3>
              <p className="my-event-meta">
                <span><strong>Venue:</strong> {event.venue}</span>
                <span className="separator">|</span>
                <span><strong>Date:</strong> {event.event_date}</span>
                <span className="separator">|</span>
                <span><strong>Time:</strong> {event.event_time}</span>
              </p>
              <p className="my-event-desc">
                {event.description 
                  ? (event.description.length > 150 
                      ? `${event.description.substring(0, 150)}...` 
                      : event.description)
                  : 'No description provided.'}
              </p>
            </div>
            <div className="my-event-actions">
              <Button
                component={Link}
                to={`/events/${event.id}`}
                variant="contained"
                color="success"
                size="small"
              >
                Manage Event
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyEvents;