const jwt = require('jsonwebtoken');

// Protect routes - only for authenticated users
exports.protect = (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];  // Extract the token
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;  // Attach the decoded token data to the request

    console.log('User authenticated:', req.user);  // Log the authenticated user for debugging
    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

// Admin-only middleware
exports.admin = (req, res, next) => {
  // Check if the user role is 'admin'
  if (req.user && req.user.user_type === 'admin' || req.user.user_type === 'store_manager') {
    console.log('Admin access granted');  // Log successful admin access
    next();
  } else {
    console.error('Admin access denied');
    return res.status(403).json({ message: 'Not authorized as admin' });
  }
};
