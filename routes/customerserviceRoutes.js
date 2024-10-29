const express = require('express');
const { createTicket, getTicketStatus } = require('../controllers/customerServiceController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Create a new customer service ticket
router.post('/', protect, createTicket);

// Get ticket status by ticket ID
router.get('/:ticket_id', protect, getTicketStatus);

module.exports = router;
