const { getPool } = require('../config/db');

const rollbackAndRelease = async (connection) => {
  try {
    await connection.rollback();
  } catch (err) {
    console.error('Rollback error:', err);
  } finally {
    connection.release();
  }
};





const adjustOtherUserWallet = async (connection, { targetUserId, actingUserId, amount, type, bookingId }) => {
  if (targetUserId === actingUserId) return;

  const [rows] = await connection.query('SELECT balance FROM users WHERE id = ? FOR UPDATE', [targetUserId]);
  if (rows.length === 0) return;

  const newBalance = Number(rows[0].balance) + amount;
  await connection.query('UPDATE users SET balance = ? WHERE id = ?', [newBalance, targetUserId]);
  await connection.query(
    `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, related_booking_id)
     VALUES (?, ?, ?, ?, ?)`,
    [targetUserId, type, Math.abs(amount), newBalance, bookingId]
  );
};

const bookTickets = async (req, res) => {
  const { event_id, quantity } = req.body;
  const user_id = req.user.id;

  const qty = parseInt(quantity, 10);
  if (!event_id || isNaN(qty) || qty <= 0) {
    return res.status(400).json({ message: 'Event ID and a positive integer quantity are required' });
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [events] = await connection.query(
      'SELECT price, available_capacity, organizer_id FROM events WHERE id = ? FOR UPDATE',
      [event_id]
    );
    if (events.length === 0) {
      await rollbackAndRelease(connection);
      return res.status(404).json({ message: 'Event not found' });
    }

    const event = events[0];
    if (event.available_capacity < qty) {
      await rollbackAndRelease(connection);
      return res.status(409).json({ message: 'Not enough seats available' });
    }

    const total_amount = event.price * qty;

    const [users] = await connection.query('SELECT balance FROM users WHERE id = ? FOR UPDATE', [user_id]);
    const currentBalance = Number(users[0].balance);
    if (currentBalance < total_amount) {
      await rollbackAndRelease(connection);
      return res.status(400).json({ message: 'Insufficient wallet balance' });
    }

    const newBalance = currentBalance - total_amount;
    await connection.query('UPDATE users SET balance = ? WHERE id = ?', [newBalance, user_id]);

    const [bookingResult] = await connection.query(
      `INSERT INTO bookings (user_id, event_id, quantity, total_amount, payment_status, booking_status)
       VALUES (?, ?, ?, ?, 'Paid', 'Confirmed')`,
      [user_id, event_id, qty, total_amount]
    );
    const bookingId = bookingResult.insertId;

    await connection.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, related_booking_id)
       VALUES (?, 'Payment', ?, ?, ?)`,
      [user_id, total_amount, newBalance, bookingId]
    );

    await adjustOtherUserWallet(connection, {
      targetUserId: event.organizer_id,
      actingUserId: user_id,
      amount: total_amount,
      type: 'Earning',
      bookingId
    });

    await connection.query(
      'UPDATE events SET available_capacity = available_capacity - ? WHERE id = ?',
      [qty, event_id]
    );

    await connection.commit();
    return res.status(201).json({
      message: 'Tickets booked and paid successfully',
      bookingId,
      total_amount,
      balance: newBalance
    });
  } catch (error) {
    console.error('Error in bookTickets transaction:', error);
    await rollbackAndRelease(connection);
    return res.status(500).json({ message: 'Server error while booking tickets' });
  } finally {
    connection.release();
  }
};

const getMyBookings = async (req, res) => {
  const user_id = req.user.id;

  try {
    const pool = getPool();
    const [bookings] = await pool.query(
      `SELECT b.id, b.quantity, b.total_amount, b.payment_status, b.booking_status, b.created_at,
              e.title as event_title, e.event_date, e.event_time, e.venue
       FROM bookings b
       JOIN events e ON b.event_id = e.id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
      [user_id]
    );
    return res.json(bookings);
  } catch (error) {
    console.error('Error in getMyBookings:', error);
    return res.status(500).json({ message: 'Server error while fetching your bookings' });
  }
};

const cancelBooking = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [bookings] = await connection.query(
      `SELECT b.event_id, b.quantity, b.total_amount, b.payment_status, b.booking_status, e.organizer_id
       FROM bookings b JOIN events e ON b.event_id = e.id
       WHERE b.id = ? AND b.user_id = ? FOR UPDATE`,
      [id, user_id]
    );
    if (bookings.length === 0) {
      await rollbackAndRelease(connection);
      return res.status(404).json({ message: 'Booking not found or not authorized to cancel' });
    }

    const booking = bookings[0];
    if (booking.booking_status !== 'Confirmed') {
      await rollbackAndRelease(connection);
      return res.status(400).json({ message: 'Only confirmed bookings can be cancelled' });
    }

    const nextPaymentStatus = booking.payment_status === 'Paid' ? 'Refunded' : booking.payment_status;
    await connection.query(
      "UPDATE bookings SET booking_status = 'Cancelled', payment_status = ? WHERE id = ?",
      [nextPaymentStatus, id]
    );
    await connection.query(
      'UPDATE events SET available_capacity = available_capacity + ? WHERE id = ?',
      [booking.quantity, booking.event_id]
    );

    if (booking.payment_status === 'Paid') {
      const [users] = await connection.query('SELECT balance FROM users WHERE id = ? FOR UPDATE', [user_id]);
      const newBalance = Number(users[0].balance) + Number(booking.total_amount);

      await connection.query('UPDATE users SET balance = ? WHERE id = ?', [newBalance, user_id]);
      await connection.query(
        `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, related_booking_id)
         VALUES (?, 'Refund', ?, ?, ?)`,
        [user_id, booking.total_amount, newBalance, id]
      );

      await adjustOtherUserWallet(connection, {
        targetUserId: booking.organizer_id,
        actingUserId: user_id,
        amount: -Number(booking.total_amount),
        type: 'Payout',
        bookingId: id
      });
    }

    await connection.commit();
    return res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error('Error in cancelBooking transaction:', error);
    await rollbackAndRelease(connection);
    return res.status(500).json({ message: 'Server error while cancelling booking' });
  } finally {
    connection.release();
  }
};

module.exports = {
  bookTickets,
  getMyBookings,
  cancelBooking
};