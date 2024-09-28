const express = require('express');
const { register, login, createCustomer, updateCustomer } = require('../controllers/authController');
const { salesman, protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// POST /auth/register - Register a new user
router.post('/register', register);

// POST /auth/login - Login a user and return JWT
router.post('/login', login);

// Create a customer account by Salesman
router.post('/create', protect, salesman, createCustomer);

// Update a customer account by Salesman
router.put('/:user_id', protect, salesman, updateCustomer);

module.exports = router;
