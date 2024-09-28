const express = require('express');
const { placeOrder, getOrderStatus, cancelOrder, getOrdersByUserId, updateOrderStatus, getAdminStats } = require('../controllers/orderController');
const { protect, salesman, admin } = require('../middlewares/authMiddleware');
const router = express.Router();

// Place an order
router.post('/', protect, placeOrder);

router.put("/status/:confirmation_number", protect, salesman, updateOrderStatus);

// Get order status by confirmation number
router.get('/status/:confirmation_number', protect, getOrderStatus);

// Cancel an order
router.delete('/:confirmation_number', protect, cancelOrder);

router.get("/stats",protect, admin, getAdminStats);

// Get all orders for the logged-in user
router.get('/', protect, getOrdersByUserId);

module.exports = router;
