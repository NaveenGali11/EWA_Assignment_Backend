const jwt = require('jsonwebtoken');

exports.generateToken = (userId, username, userType) => {
    return jwt.sign({ id: userId, username, user_type: userType }, process.env.JWT_SECRET, { expiresIn: '1h' });
  };
  
