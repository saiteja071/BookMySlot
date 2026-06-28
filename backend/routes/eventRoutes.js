const express = require('express');
const router = express.Router();
const { authMiddleware, isOrganizer } = require('../middlewares/authMiddleware');
const { 
  createEvent, 
  getAllEvents, 
  getOrganizerEvents, 
  getEventById,
  deleteEvent,
  updateEventCapacity
} = require('../controllers/eventController');

router.post('/', authMiddleware, isOrganizer, createEvent);
router.get('/', authMiddleware, getAllEvents);
router.get('/my/events', authMiddleware, isOrganizer, getOrganizerEvents);
router.get('/:id', authMiddleware, getEventById);
router.delete('/:id', authMiddleware, isOrganizer, deleteEvent);
router.put('/:id/capacity', authMiddleware, isOrganizer, updateEventCapacity);

module.exports = router;
