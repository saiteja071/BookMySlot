const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const { bookTickets, getMyBookings, cancelBooking } = require('../controllers/bookingController');

router.post('/', authMiddleware, bookTickets);
router.get('/my', authMiddleware, getMyBookings);
router.put('/:id/cancel', authMiddleware, cancelBooking);

module.exports = router;
