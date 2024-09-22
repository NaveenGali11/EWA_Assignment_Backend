const express = require('express');
const { addProduct, getProducts, getProductById, updateProduct, deleteProduct } = require('../controllers/productController');
const { protect, admin } = require('../middlewares/authMiddleware');

const router = express.Router();

// Public routes
router.get('/', getProducts);  // Get all products
router.get('/:id', getProductById);  // Get product details by ID

// Admin routes (protected)
router.post('/', protect, admin, addProduct);  // Add a new product
router.put('/:id', protect, admin, updateProduct);  // Update a product
router.delete('/:id', protect, admin, deleteProduct);  // Delete a product

module.exports = router;
