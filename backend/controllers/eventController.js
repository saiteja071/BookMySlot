const { getPool } = require('../config/db');

const createEvent = async (req, res) => {
  const { title, description, venue, event_date, event_time, price, total_capacity } = req.body;
  const organizer_id = req.user.id;

  if (!title || !venue || !event_date || !event_time || price === undefined || total_capacity === undefined) {
    return res.status(400).json({ message: 'Title, venue, event_date, event_time, price, and total_capacity are required' });
  }

  const priceNum = Number(price);
  const capacityNum = parseInt(total_capacity, 10);

  if (isNaN(priceNum) || priceNum <= 0) {
    return res.status(400).json({ message: 'Price must be a positive number' });
  }
  if (isNaN(capacityNum) || capacityNum <= 0) {
    return res.status(400).json({ message: 'Total capacity must be a positive integer' });
  }

  try {
    const pool = getPool();
    const [result] = await pool.query(
      `INSERT INTO events (title, description, venue, event_date, event_time, price, total_capacity, available_capacity, organizer_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description || '', venue, event_date, event_time, priceNum, capacityNum, capacityNum, organizer_id]
    );
    return res.status(201).json({ message: 'Event created successfully', eventId: result.insertId });
  } catch (error) {
    console.error('Error creating event:', error);
    return res.status(500).json({ message: 'Server error while creating event' });
  }
};

const getAllEvents = async (req, res) => {
  try {
    const pool = getPool();
    const [events] = await pool.query('SELECT * FROM events ORDER BY event_date ASC, event_time ASC');
    return res.json(events);
  } catch (error) {
    console.error('Error fetching all events:', error);
    return res.status(500).json({ message: 'Server error while fetching events' });
  }
};

const getOrganizerEvents = async (req, res) => {
  const organizer_id = req.user.id;
  try {
    const pool = getPool();
    const [events] = await pool.query(
      'SELECT * FROM events WHERE organizer_id = ? ORDER BY event_date ASC, event_time ASC',
      [organizer_id]
    );
    return res.json(events);
  } catch (error) {
    console.error('Error fetching organizer events:', error);
    return res.status(500).json({ message: 'Server error while fetching your events' });
  }
};

const getEventById = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = getPool();
    const [events] = await pool.query(
      `SELECT e.*, u.name as organizer_name, u.email as organizer_email
       FROM events e JOIN users u ON e.organizer_id = u.id WHERE e.id = ?`,
      [id]
    );
    if (events.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    return res.json({ event: events[0] });
  } catch (error) {
    console.error('Error fetching event detail:', error);
    return res.status(500).json({ message: 'Server error while fetching event details' });
  }
};

const deleteEvent = async (req, res) => {
  const { id } = req.params;
  const organizer_id = req.user.id;
  const pool = getPool();
  const connection = await pool.getConnection();

  
  
  const refundBooking = async (booking) => {
    const [payerRows] = await connection.query(
      'SELECT balance FROM users WHERE id = ? FOR UPDATE',
      [booking.user_id]
    );
    const newPayerBalance = Number(payerRows[0].balance) + Number(booking.total_amount);
    await connection.query('UPDATE users SET balance = ? WHERE id = ?', [newPayerBalance, booking.user_id]);
    await connection.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, related_booking_id)
       VALUES (?, 'Refund', ?, ?, ?)`,
      [booking.user_id, booking.total_amount, newPayerBalance, booking.id]
    );

    if (booking.user_id === organizer_id) return; 

    const [orgRows] = await connection.query('SELECT balance FROM users WHERE id = ? FOR UPDATE', [organizer_id]);
    const newOrgBalance = Number(orgRows[0].balance) - Number(booking.total_amount);
    await connection.query('UPDATE users SET balance = ? WHERE id = ?', [newOrgBalance, organizer_id]);
    await connection.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, related_booking_id)
       VALUES (?, 'Payout', ?, ?, ?)`,
      [organizer_id, booking.total_amount, newOrgBalance, booking.id]
    );
  };

  try {
    await connection.beginTransaction();

    const [events] = await connection.query(
      'SELECT organizer_id FROM events WHERE id = ? FOR UPDATE',
      [id]
    );
    if (events.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Event not found' });
    }
    if (events[0].organizer_id !== organizer_id) {
      await connection.rollback();
      return res.status(403).json({ message: 'Access denied: You do not own this event' });
    }

    
    
    const [activeBookings] = await connection.query(
      `SELECT id, user_id, total_amount, payment_status FROM bookings
       WHERE event_id = ? AND booking_status = 'Confirmed' FOR UPDATE`,
      [id]
    );

    for (const booking of activeBookings) {
      if (booking.payment_status === 'Paid') {
        await refundBooking(booking);
      }
      const nextPaymentStatus = booking.payment_status === 'Paid' ? 'Refunded' : booking.payment_status;
      await connection.query(
        "UPDATE bookings SET booking_status = 'Cancelled', payment_status = ? WHERE id = ?",
        [nextPaymentStatus, booking.id]
      );
    }

    await connection.query('DELETE FROM events WHERE id = ?', [id]);
    await connection.commit();

    return res.json({
      message: activeBookings.length > 0
        ? 'Event deleted; confirmed bookings were cancelled and refunded'
        : 'Event deleted successfully'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error deleting event:', error);
    return res.status(500).json({ message: 'Server error while deleting event' });
  } finally {
    connection.release();
  }
};

const updateEventCapacity = async (req, res) => {
  const { id } = req.params;
  const { total_capacity } = req.body;
  const organizer_id = req.user.id;

  const newCapacity = parseInt(total_capacity, 10);
  if (isNaN(newCapacity) || newCapacity <= 0) {
    return res.status(400).json({ message: 'Total capacity must be a positive integer' });
  }

  try {
    const pool = getPool();
    const [events] = await pool.query(
      'SELECT total_capacity, available_capacity, organizer_id FROM events WHERE id = ?',
      [id]
    );
    if (events.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const event = events[0];
    if (event.organizer_id !== organizer_id) {
      return res.status(403).json({ message: 'Access denied: You do not own this event' });
    }

    const booked = event.total_capacity - event.available_capacity;
    if (newCapacity < booked) {
      return res.status(400).json({
        message: `New capacity cannot be less than tickets already booked (booked: ${booked})`
      });
    }

    const newAvailable = event.available_capacity + (newCapacity - event.total_capacity);

    await pool.query(
      'UPDATE events SET total_capacity = ?, available_capacity = ? WHERE id = ?',
      [newCapacity, newAvailable, id]
    );

    return res.json({
      message: 'Capacity updated successfully',
      total_capacity: newCapacity,
      available_capacity: newAvailable
    });
  } catch (error) {
    console.error('Error updating event capacity:', error);
    return res.status(500).json({ message: 'Server error while updating capacity' });
  }
};

module.exports = {
  createEvent,
  getAllEvents,
  getOrganizerEvents,
  getEventById,
  deleteEvent,
  updateEventCapacity
};