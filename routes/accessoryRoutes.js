const express = require('express');
const {
  addAccessory,
  getAccessories,
  updateAccessory,
  deleteAccessory
} = require('../controllers/accessoryController');
const { protect, admin } = require('../middlewares/authMiddleware');

const router = express.Router();

// Add a new accessory to a product (admin-only)
router.post('/products/:product_id/accessories', protect, admin, addAccessory);

// Get all accessories for a product (public)
router.get('/products/:product_id/accessories', getAccessories);

// Update an accessory (admin-only)
router.put('/accessories/:id', protect, admin, updateAccessory);

// Delete an accessory (admin-only)
router.delete('/accessories/:id', protect, admin, deleteAccessory);

module.exports = router;
