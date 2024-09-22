const db = require('../config/db');

const User = {
  create: (userData, callback) => {
    const query = 'INSERT INTO users (username, email, password, user_type) VALUES (?, ?, ?, ?)';
    db.query(query, [userData.username, userData.email, userData.password, userData.user_type], callback);
  },
  findByUsername: (username, callback) => {
    const query = 'SELECT * FROM users WHERE username = ?';
    db.query(query, [username], callback);
  }
};

module.exports = User;
