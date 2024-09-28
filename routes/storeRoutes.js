const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Fetch all store locations
router.get('/', (req, res) => {
  const query = 'SELECT * FROM stores';

  db.query(query, (err, result) => {
    if (err) {
      console.error('Error fetching store locations:', err.message);
      return res.status(500).json({ message: 'Error fetching store locations' });
    }

    // Return the list of stores
    res.json(result);
  });
});

module.exports = router;
