const express = require('express');
const {
  addToCart,
  getCartByUserId,
  updateCartItem,
  removeFromCart
} = require('../controllers/cartController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Add a product or accessory to the cart
router.post('/cart', protect, addToCart);

// Get all cart items for a user (including products and accessories)
router.get('/cart/:user_id', protect, getCartByUserId);

// Update the quantity of a cart item
router.put('/cart/:id', protect, updateCartItem);

// Remove an item (product or accessory) from the cart
router.delete('/cart/:id', protect, removeFromCart);

module.exports = router;
