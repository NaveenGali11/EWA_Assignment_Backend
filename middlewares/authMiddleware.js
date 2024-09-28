const jwt = require('jsonwebtoken');
const db = require('../config/db');

exports.protect = (req, res, next) => {
  let token;

  // Check for the Bearer token in the authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];  // Extract token from the header
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;  // Attach decoded token (including user ID) to the request

    // Optionally, fetch the user details from the database if needed
    const query = 'SELECT * FROM users WHERE id = ?';
    db.query(query, [req.user.id], (err, result) => {
      if (err || result.length === 0) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      req.user = result[0];  // Attach user information to req.user
      next();  // Proceed to the next middleware or route handler
    });

  } catch (error) {
    console.error('Token verification failed:', error.message);
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

// Middleware to allow only salesman access
exports.salesman = (req, res, next) => {
  if (req.user && req.user.user_type === 'sales_man') {
    next();
  } else {
    return res.status(403).json({ message: 'Access denied. Salesman role required.' });
  }
};


// Admin-only middleware
exports.admin = (req, res, next) => {
  console.log("USER :- ",req.user);
  
  // Check if the user role is 'admin'
  if (req.user && req.user.user_type === 'admin' || req.user.user_type === 'store_manager') {
    console.log('Admin access granted');  // Log successful admin access
    next();
  } else {
    console.error('Admin access denied');
    return res.status(403).json({ message: 'Not authorized as admin' });
  }
};
