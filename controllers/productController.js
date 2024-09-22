const db = require("../config/db");
const path = require("path");
const multer = require("multer");

function generateProductId() {
  const timestamp = Date.now(); // Get current timestamp
  const random = Math.floor(Math.random() * 1000); // Generate a random number between 0 and 999
  return `${timestamp}${random}`; // Concatenate timestamp and random number
}

// Set up multer for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Destination folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Filename with timestamp
  },
});

// Initialize multer upload function
const upload = multer({ storage: storage }).single("image"); // Expect single file upload with field name 'image'

// Add a new product (Admin only)
exports.addProduct = (req, res) => {
  upload(req, res, function (err) {
    if (err) {
      console.error("Error uploading image:", err.message);
      return res.status(500).json({ message: "Error uploading image" });
    }

    const {
      name,
      category,
      price,
      description,
      on_sale,
      manufacturer,
      warranty,
      retailer_discount,
      manufacturer_rebate,
    } = req.body;
    const image = req.file ? req.file.filename : null; // Get uploaded image filename
    const productId = generateProductId(); // Generate unique product ID based on timestamp

    // Ensure required fields are provided
    if (!name || !price) {
      return res.status(400).json({ message: "Name and price are required" });
    }

    const query = `
      INSERT INTO products 
      (id, name, category, price, description, on_sale, manufacturer, warranty, retailer_discount, manufacturer_rebate, image) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      query,
      [
        productId,
        name,
        category,
        price,
        description,
        on_sale,
        manufacturer,
        warranty,
        retailer_discount,
        manufacturer_rebate,
        image,
      ],
      (err, result) => {
        if (err) {
          console.error("Error executing query:", err.message);
          return res
            .status(500)
            .json({ error: "Error adding product", details: err.message });
        }

        // Return product information along with image URL and productId
        const imageUrl = image
          ? `http://localhost:5001/uploads/${image}`
          : null;
        return res.status(201).json({
          message: "Product added successfully",
          productId,
          name,
          category,
          price,
          description,
          on_sale,
          manufacturer,
          warranty,
          retailer_discount,
          manufacturer_rebate,
          image,
        });
      }
    );
  });
};

// Get all products (Public)
exports.getProducts = (req, res) => {
  const query = "SELECT * FROM products";

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching products:", err);
      return res.status(500).json({ message: "Error fetching products" });
    }

    const products = results.map((product) => ({
      ...product,
      imageUrl: product.image
        ? `http://localhost:5001/uploads/${product.image}`
        : null,
    }));

    res.json({ products: products });
  });
};

exports.getProductById = (req, res) => {
  const { id } = req.params;

  const productQuery = "SELECT * FROM products WHERE id = ?";
  const accessoryQuery = "SELECT * FROM accessories WHERE product_id = ?";

  db.query(productQuery, [id], (err, productResult) => {
    if (err) {
      console.error("Error fetching product:", err);
      return res.status(500).json({ message: "Error fetching product" });
    }

    if (productResult.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    const product = productResult[0];

    db.query(accessoryQuery, [id], (err, accessoryResult) => {
      if (err) {
        console.error("Error fetching accessories:", err);
        return res.status(500).json({ message: "Error fetching accessories" });
      }

      const accessories = accessoryResult.map((accessory) => ({
        ...accessory,
        imageUrl: accessory.image
          ? `http://localhost:5001/uploads/${accessory.image}`
          : null,
      }));

      return res.json({
        ...product,
        imageUrl: product.image
          ? `http://localhost:5001/uploads/${product.image}`
          : null,
        accessories,
      });
    });
  });
};

// Update a product (Admin only)
exports.updateProduct = (req, res) => {
  const { id } = req.params;
  const { name, price, on_sale } = req.body;

  const query =
    "UPDATE products SET name = ?, price = ?, on_sale = ? WHERE id = ?";

  db.query(query, [name, price, on_sale, id], (err, result) => {
    if (err) {
      console.error("Error updating product:", err);
      return res.status(500).json({ message: "Error updating product" });
    }

    res.json({ message: "Product updated successfully" });
  });
};

// Delete a product (Admin only)
exports.deleteProduct = (req, res) => {
  const { id } = req.params;
  const query = "DELETE FROM products WHERE id = ?";

  db.query(query, [id], (err, result) => {
    if (err) {
      console.error("Error deleting product:", err);
      return res.status(500).json({ message: "Error deleting product" });
    }

    res.json({ message: "Product deleted successfully" });
  });
};

exports.addAccessory = (req, res) => {
  upload(req,res,function(err) {
    if (err) {
      console.error("Error uploading image:", err.message);
      return res.status(500).json({ message: "Error uploading image" });
    }
    const { product_id } = req.params;
    const { name, price, description, image } = req.body;

    

    const accessoryId = generateProductId(); // Use the same ID generation function

    const query = `
      INSERT INTO accessories (id, name, product_id, price, description, image) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(
      query,
      [accessoryId, name, product_id, price, description, image],
      (err, result) => {
        if (err) {
          console.error("Error adding accessory:", err.message);
          return res
            .status(500)
            .json({ error: "Error adding accessory", details: err.message });
        }

        return res
          .status(201)
          .json({ message: "Accessory added successfully", accessoryId });
      }
    );
  })
};
