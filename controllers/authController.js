const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { generateToken } = require('../utils/jwtUtils');

exports.register = (req, res) => {
    const { username, email, password, user_type } = req.body;
  
    // Hash the password
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) return res.status(500).json({ error: err });
  
      const userData = { username, email, password: hashedPassword, user_type };
      
      // Create user in the database
      User.create(userData, (err, result) => {
        if (err) return res.status(500).json({ error: err });
        const token = generateToken(userData.id, userData.username, userData.user_type);
        res.status(201).json({ message: 'User registered successfully', username: userData.username, token, userType: userData.user_type, email: userData.email  });
      });
    });
  };
  

exports.login = (req, res) => {
  const { username, password } = req.body;

  // Find user by username
  User.findByUsername(username, (err, results) => {
    if (err || results.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = results[0];

    // Compare passwords
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err || !isMatch) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      // Generate JWT token
      const token = generateToken(user.id, user.username, user.user_type);
      res.json({ message: 'Login successful', token ,username:  user.username,userType: user.user_type});
    });
  });
};
