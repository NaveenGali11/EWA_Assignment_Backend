const express = require('express');
const {
    addProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    getFilteredProducts, getInventoryReport, getAutoCompleteSuggestions // Import the trending products function
} = require('../controllers/productController');
const {protect, admin, salesman} = require('../middlewares/authMiddleware');

const router = express.Router();

// Public routes
router.get('/', getProducts);  // Get all products

// Add inventory report route
router.get('/inventoryreport', protect, salesman, getInventoryReport); // Inventory Report

router.get("/autocomplete", getAutoCompleteSuggestions)

// Trending products route
router.get('/trending', getFilteredProducts);  // Get trending products

router.get('/:id', getProductById);  // Get product details by ID

// Admin routes (protected)
router.post('/', protect, admin, addProduct);  // Add a new product
router.put('/:id', protect, admin, updateProduct);  // Update a product
router.delete('/:id', protect, admin, deleteProduct);  // Delete a product

module.exports = router;
