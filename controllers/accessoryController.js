const db = require('../config/db');
const path = require('path');
const multer = require('multer');

// Setup multer for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');  // Destination folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));  // Filename with timestamp
  }
});

const upload = multer({ storage: storage }).single('image');

// Function to generate a unique accessory ID based on timestamp
function generateAccessoryId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${timestamp}${random}`;
}

// Add a new accessory to a product
exports.addAccessory = (req, res) => {
  upload(req, res, function (err) {
    if (err) {
      console.error('Error uploading image:', err.message);
      return res.status(500).json({ message: 'Error uploading image' });
    }

    const { product_id } = req.params;
    const { name, price, description } = req.body;
    const image = req.file ? req.file.filename : null;
    const accessoryId = generateAccessoryId();

    if (!name || !price) {
      return res.status(400).json({ message: 'Name and price are required' });
    }

    // Step 1: Ensure the product exists
    const checkProductQuery = 'SELECT * FROM products WHERE id = ?';
    db.query(checkProductQuery, [product_id], (err, productResult) => {
      if (err) {
        console.error('Error checking product existence:', err.message);
        return res.status(500).json({ message: 'Error checking product existence' });
      }

      if (productResult.length === 0) {
        return res.status(404).json({ message: 'Product not found' });
      }

      // Step 2: Insert the accessory
      const insertAccessoryQuery = `
        INSERT INTO accessories (id, name, product_id, price, description, image) 
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      db.query(insertAccessoryQuery, [accessoryId, name, product_id, price, description, image], (err, result) => {
        if (err) {
          console.error('Error inserting accessory:', err.message);
          return res.status(500).json({ message: 'Error inserting accessory', details: err.message });
        }

        console.log(`Accessory added successfully: ${accessoryId}`);
        return res.status(201).json({ message: 'Accessory added successfully', accessoryId });
      });
    });
  });
};

// Get all accessories for a product
exports.getAccessories = (req, res) => {
  const { product_id } = req.params;

  const query = 'SELECT * FROM accessories WHERE product_id = ?';

  db.query(query, [product_id], (err, result) => {
    if (err) {
      console.error('Error fetching accessories:', err);
      return res.status(500).json({ message: 'Error fetching accessories' });
    }

    const accessories = result.map(accessory => ({
      ...accessory,
      imageUrl: accessory.image ? `http://localhost:5001/uploads/${accessory.image}` : null
    }));

    return res.json(accessories);
  });
};

// Update an accessory
exports.updateAccessory = (req, res) => {
  const { id } = req.params;
  const { name, price, description } = req.body;

  const query = `
    UPDATE accessories SET name = ?, price = ?, description = ? WHERE id = ?
  `;

  db.query(query, [name, price, description, id], (err, result) => {
    if (err) {
      console.error('Error updating accessory:', err.message);
      return res.status(500).json({ error: 'Error updating accessory', details: err.message });
    }

    return res.status(200).json({ message: 'Accessory updated successfully' });
  });
};

// Delete an accessory
exports.deleteAccessory = (req, res) => {
  const { id } = req.params;

  const query = 'DELETE FROM accessories WHERE id = ?';

  db.query(query, [id], (err, result) => {
    if (err) {
      console.error('Error deleting accessory:', err.message);
      return res.status(500).json({ message: 'Error deleting accessory' });
    }

    return res.status(200).json({ message: 'Accessory deleted successfully' });
  });
};
