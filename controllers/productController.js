const db = require("../config/db");
const path = require("path");
const multer = require("multer");
const Review = require('../models/reviewModel');  // Assuming you have a Review model for MongoDB

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

// // Add a new product (Admin only)
// exports.addProduct = (req, res) => {
//   upload(req, res, function (err) {
//     if (err) {
//       console.error("Error uploading image:", err.message);
//       return res.status(500).json({ message: "Error uploading image" });
//     }
//
//     const {
//       name,
//       category,
//       price,
//       description,
//       on_sale,
//       manufacturer,
//       warranty,
//       retailer_discount,
//       manufacturer_rebate,
//     } = req.body;
//     const image = req.file ? req.file.filename : null; // Get uploaded image filename
//     const productId = generateProductId(); // Generate unique product ID based on timestamp
//
//     // Ensure required fields are provided
//     if (!name || !price) {
//       return res.status(400).json({ message: "Name and price are required" });
//     }
//
//     const query = `
//       INSERT INTO products
//       (id, name, category, price, description, on_sale, manufacturer, warranty, retailer_discount, manufacturer_rebate, image)
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//     `;
//
//     db.query(
//       query,
//       [
//         productId,
//         name,
//         category,
//         price,
//         description,
//         on_sale,
//         manufacturer,
//         warranty,
//         retailer_discount,
//         manufacturer_rebate,
//         image,
//       ],
//       (err, result) => {
//         if (err) {
//           console.error("Error executing query:", err.message);
//           return res
//             .status(500)
//             .json({ error: "Error adding product", details: err.message });
//         }
//
//         // Return product information along with image URL and productId
//         const imageUrl = image
//           ? `http://localhost:5001/uploads/${image}`
//           : null;
//         return res.status(201).json({
//           message: "Product added successfully",
//           productId,
//           name,
//           category,
//           price,
//           description,
//           on_sale,
//           manufacturer,
//           warranty,
//           retailer_discount,
//           manufacturer_rebate,
//           image,
//         });
//       }
//     );
//   });
// };

// Add a new product (Admin only)
exports.addProduct = (req, res) => {
  upload(req, res, function (err) {
    if (err) {
      console.error("Error uploading image:", err.message);
      return res.status(500).json({ message: "Error uploading image" });
    }

    const {
      name, category, price, description, on_sale, manufacturer, warranty, retailer_discount, manufacturer_rebate, stock_quantity
    } = req.body;

    const image = req.file ? req.file.filename : null;
    const productId = generateProductId();
    const defaultStockQuantity = stock_quantity ? stock_quantity : 50;  // Default to 50 if not provided

    if (!name || !price) {
      return res.status(400).json({ message: "Name and price are required" });
    }

    const query = `
      INSERT INTO products 
      (id, name, category, price, description, on_sale, manufacturer, warranty, retailer_discount, manufacturer_rebate, image, stock_quantity) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        query,
        [productId, name, category, price, description, on_sale, manufacturer, warranty, retailer_discount, manufacturer_rebate, image, defaultStockQuantity],
        (err, result) => {
          if (err) {
            console.error("Error executing query:", err.message);
            return res.status(500).json({ error: "Error adding product", details: err.message });
          }

          const imageUrl = image ? `http://localhost:5001/uploads/${image}` : null;
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
            stock_quantity: defaultStockQuantity  // Include default stock quantity
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

// exports.addAccessory = (req, res) => {
//   upload(req,res,function(err) {
//     if (err) {
//       console.error("Error uploading image:", err.message);
//       return res.status(500).json({ message: "Error uploading image" });
//     }
//     const { product_id } = req.params;
//     const { name, price, description, image } = req.body;
//
//
//
//     const accessoryId = generateProductId(); // Use the same ID generation function
//
//     const query = `
//       INSERT INTO accessories (id, name, product_id, price, description, image)
//       VALUES (?, ?, ?, ?, ?, ?)
//     `;
//
//     db.query(
//       query,
//       [accessoryId, name, product_id, price, description, image],
//       (err, result) => {
//         if (err) {
//           console.error("Error adding accessory:", err.message);
//           return res
//             .status(500)
//             .json({ error: "Error adding accessory", details: err.message });
//         }
//
//         return res
//           .status(201)
//           .json({ message: "Accessory added successfully", accessoryId });
//       }
//     );
//   })
// };

// Add a new accessory to a product (Admin only)
exports.addAccessory = (req, res) => {
  upload(req, res, function (err) {
    if (err) {
      console.error('Error uploading image:', err.message);
      return res.status(500).json({ message: 'Error uploading image' });
    }

    const { product_id } = req.params;
    const { name, price, description, stock_quantity } = req.body;
    const image = req.file ? req.file.filename : null;
    const accessoryId = generateProductId();
    const defaultStockQuantity = stock_quantity ? stock_quantity : 25;  // Default to 25 for accessories

    if (!name || !price) {
      return res.status(400).json({ message: 'Name and price are required' });
    }

    const checkProductQuery = 'SELECT * FROM products WHERE id = ?';
    db.query(checkProductQuery, [product_id], (err, productResult) => {
      if (err) {
        console.error('Error checking product existence:', err.message);
        return res.status(500).json({ message: 'Error checking product existence' });
      }

      if (productResult.length === 0) {
        return res.status(404).json({ message: 'Product not found' });
      }

      const insertAccessoryQuery = `
        INSERT INTO accessories (id, name, product_id, price, description, image, stock_quantity) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(insertAccessoryQuery, [accessoryId, name, product_id, price, description, image, defaultStockQuantity], (err, result) => {
        if (err) {
          console.error('Error inserting accessory:', err.message);
          return res.status(500).json({ message: 'Error inserting accessory', details: err.message });
        }

        return res.status(201).json({ message: 'Accessory added successfully', accessoryId });
      });
    });
  });
};


// Get trending products based on order frequency
// exports.getTrendingProducts = (req, res) => {
//   try {
//     console.log("Trending products endpoint hit!");

//     // Query to get the count of ordered products from order_items
//     const trendingProductsQuery = `
//       SELECT p.id, p.name, p.price, p.manufacturer, p.image, 
//              COUNT(oi.product_id) AS order_count 
//       FROM order_items oi
//       JOIN products p ON oi.product_id = p.id
//       GROUP BY oi.product_id
//       ORDER BY order_count DESC
//       LIMIT 10;
//     `;

//     db.query(trendingProductsQuery, (err, result) => {
//       if (err) {
//         console.error("Error fetching trending products:", err.message);
//         return res.status(500).json({ message: "Error fetching trending products" });
//       }

//       // Return the trending products
//       res.status(200).json(result);
//     });
//   } catch (error) {
//     console.error("Error getting trending products:", error.message);
//     res.status(500).json({ message: "Error getting trending products" });
//   }
// };

exports.getFilteredProducts = async (req, res) => {
  const filterType = req.query.filter; // e.g., 'most-reviewed', 'top-rated'

  try {
    let mongoQuery = [];
    let mysqlProductIds = [];

    switch (filterType) {
      case 'most-reviewed':
        // MongoDB aggregation to get the most reviewed products
        mongoQuery = [
          { 
            $group: { 
              _id: "$product_id",  // Group by product_id
              review_count: { $sum: 1 }  // Count number of reviews per product
            }
          },
          { $sort: { review_count: -1 } },  // Sort by review count (most reviewed)
          { $limit: 10 }  // Limit to top 10 most-reviewed products
        ];
        break;

      case 'top-rated':
        // MongoDB aggregation to get the top-rated products
        mongoQuery = [
          { 
            $group: { 
              _id: "$product_id",  // Group by product_id
              average_rating: { $avg: "$rating" },  // Calculate average rating
            }
          },
          { $sort: { average_rating: -1 } },  // Sort by average rating (highest rated)
          { $limit: 10 }  // Limit to top 10 top-rated products
        ];
        break;

      default:
        // Fallback to the most ordered products (using MySQL)
        const mysqlQuery = `
          SELECT p.id, p.name, p.price, p.manufacturer, p.image, 
                COUNT(oi.product_id) AS order_count 
          FROM order_items oi
          JOIN products p ON oi.product_id = p.id
          GROUP BY oi.product_id
          ORDER BY order_count DESC
          LIMIT 10;
        `;

        db.query(mysqlQuery, (err, result) => {
          if (err) {
            console.error("Error fetching products:", err.message);
            return res.status(500).json({ message: "Error fetching products" });
          }
          return res.status(200).json(result);  // Return the MySQL results for trending products
        });
        return;
    }

    // Fetching data from MongoDB (reviews collection)
    const trendingData = await Review.aggregate(mongoQuery);

    // Collect product IDs from MongoDB results
    mysqlProductIds = trendingData.map(item => item._id);

    // If no product IDs were found, return empty array
    if (mysqlProductIds.length === 0) {
      return res.status(200).json([]);
    }

    // Fetch product details from MySQL based on product_ids from MongoDB
    const productQuery = `
      SELECT id, name, price, manufacturer, image
      FROM products
      WHERE id IN (?)
    `;

    db.query(productQuery, [mysqlProductIds], (err, products) => {
      if (err) {
        console.error("Error fetching product details:", err.message);
        return res.status(500).json({ message: "Error fetching product details" });
      }

      // Merge MongoDB review data with MySQL product data
      const filteredProducts = products.map(product => {
        const reviewData = trendingData.find(item => item._id == product.id);
        return {
          ...product,
          review_count: reviewData ? reviewData.review_count : 0,  // Only for 'most-reviewed'
          average_rating: reviewData && reviewData.average_rating ? reviewData.average_rating.toFixed(2) : null,  // Only for 'top-rated'
        };
      });

      res.status(200).json(filteredProducts);
    });
  } catch (error) {
    console.error("Error getting filtered products:", error.message);
    res.status(500).json({ message: "Error getting filtered products" });
  }
};

// Get Inventory Report
exports.getInventoryReport = (req, res) => {
  const allProductsQuery = `
    SELECT name, price, stock_quantity 
    FROM products
  `;

  const onSaleProductsQuery = `
    SELECT name, price, stock_quantity 
    FROM products 
    WHERE on_sale = 1
  `;

  const rebateProductsQuery = `
    SELECT name, price, stock_quantity, manufacturer_rebate 
    FROM products 
    WHERE manufacturer_rebate IS NOT NULL
  `;

  // Fetch all product data
  db.query(allProductsQuery, (err, allProducts) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching inventory data', error: err });
    }

    // Fetch products on sale
    db.query(onSaleProductsQuery, (err, onSaleProducts) => {
      if (err) {
        return res.status(500).json({ message: 'Error fetching on-sale products', error: err });
      }

      // Fetch products with manufacturer rebates
      db.query(rebateProductsQuery, (err, rebateProducts) => {
        if (err) {
          return res.status(500).json({ message: 'Error fetching rebate products', error: err });
        }

        // Prepare response with all three sets of data
        return res.status(200).json({
          allProducts,  // All products with stock
          onSaleProducts,  // Products currently on sale
          rebateProducts  // Products with manufacturer rebates
        });
      });
    });
  });
};

// Auto-complete search from products table
exports.getAutoCompleteSuggestions = (req, res) => {
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ message: 'Query is required' });
  }

  // SQL query to fetch all product information for products whose names match the search query
  const searchQuery = `
    SELECT id, name, price, stock_quantity, description, on_sale, manufacturer, warranty, image
    FROM products 
    WHERE name LIKE ? 
    LIMIT 4
  `;

  db.query(searchQuery, [`%${query}%`], (err, results) => {
    if (err) {
      console.error("Error fetching search suggestions:", err);
      return res.status(500).json({ message: "Error fetching suggestions", error: err });
    }

    // Return the full product information
    res.status(200).json({ suggestions: results });
  });
};

