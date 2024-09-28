const db = require("../config/db"); // Database connection

// Helper function to generate a random 7-digit confirmation number
function generateConfirmationNumber() {
  return Math.floor(1000000 + Math.random() * 9000000).toString(); // 7-digit number
}

// Place an order
// exports.placeOrder = (req, res) => {
//   const { user_id, cart_items, delivery_type, store_id, customer_details } = req.body;

//   // Validate required fields
//   if (!user_id || !cart_items || !delivery_type || !customer_details) {
//     return res.status(400).json({ message: 'Missing required order information' });
//   }

//   if (delivery_type === 'store_pickup' && !store_id) {
//     return res.status(400).json({ message: 'Missing store selection for pickup' });
//   }

//   // Calculate totals
//   let subtotal = 0;
//   cart_items.forEach(item => {
//     subtotal += item.price * item.quantity;
//   });

//   const tax = subtotal * 0.02;
//   const delivery_fee = delivery_type === 'home_delivery' ? subtotal * 0.01 : 0;
//   const total = subtotal + tax + delivery_fee;

//   // Generate confirmation number and set delivery/pickup date (2 weeks later)
//   const confirmation_number = generateConfirmationNumber();
//   const deliveryDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];  // 2 weeks from now

//   // Insert order into MySQL
//   const orderQuery = `
//       INSERT INTO orders (user_id, confirmation_number, subtotal, tax, delivery_fee, total, delivery_type, delivery_date, customer_name, customer_address, customer_email, payment_method, store_id)
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//   `;

//   const orderValues = [
//     user_id, confirmation_number, subtotal.toFixed(2), tax.toFixed(2), delivery_fee.toFixed(2), total.toFixed(2),
//     delivery_type, deliveryDate, customer_details.name, customer_details.address, customer_details.email, customer_details.payment_method, store_id || null
//   ];

//   db.query(orderQuery, orderValues, (err, result) => {
//     if (err) {
//       console.error('Error placing order:', err.message);
//       return res.status(500).json({ message: 'Error placing order' });
//     }

//     // Insert order items into order_items table
//     const orderItemsQuery = `INSERT INTO order_items (order_id, product_id, accessory_id, quantity, price) VALUES ?`;
//     const orderItemsValues = cart_items.map(item => [
//       result.insertId,
//       item.product_id || null,
//       item.accessory_id || null,
//       item.quantity,
//       item.price
//     ]);

//     db.query(orderItemsQuery, [orderItemsValues], (err, orderItemsResult) => {
//       if (err) {
//         console.error('Error adding order items:', err.message);
//         return res.status(500).json({ message: 'Error placing order items' });
//       }

//       // Clear the cart for this user
//       db.query(`DELETE FROM cart WHERE user_id = ?`, [user_id], (err, clearCartResult) => {
//         if (err) {
//           console.error('Error clearing cart:', err.message);
//           return res.status(500).json({ message: 'Error clearing cart' });
//         }

//         res.status(201).json({
//           confirmation_number,
//           delivery_date: deliveryDate,
//           total: total.toFixed(2),
//           store_id
//         });
//       });
//     });
//   });
// };

exports.placeOrder = (req, res) => {
  const { user_id, cart_items, delivery_type, store_id, customer_details } =
    req.body;

  // Validate required fields
  if (!user_id || !cart_items || !delivery_type || !customer_details) {
    return res
      .status(400)
      .json({ message: "Missing required order information" });
  }

  if (delivery_type === "store_pickup" && !store_id) {
    return res
      .status(400)
      .json({ message: "Missing store selection for pickup" });
  }

  // Calculate totals
  let subtotal = 0;
  cart_items.forEach((item) => {
    subtotal += item.price * item.quantity;
  });

  // Apply 3% discount if subtotal is greater than or equal to $70
  let discount = 0;
  if (subtotal >= 70) {
    discount = subtotal * 0.03; // 3% discount
    subtotal -= discount; // Adjust the subtotal after discount
  }

  // Calculate tax and delivery fee
  const tax = subtotal * 0.02;
  const delivery_fee = delivery_type === "home_delivery" ? subtotal * 0.01 : 0;
  const total = subtotal + tax + delivery_fee;

  // Generate confirmation number and set delivery/pickup date (2 weeks later)
  const confirmation_number = generateConfirmationNumber();
  const deliveryDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0]; // 2 weeks from now

  // Insert order into MySQL
  const orderQuery = `
      INSERT INTO orders (user_id, confirmation_number, subtotal, discount, tax, delivery_fee, total, delivery_type, delivery_date, customer_name, address1, address2, city, state, zip, customer_email, payment_method, card_number, card_expiry, card_cvv, store_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `;

  const orderValues = [
    user_id,
    confirmation_number,
    subtotal.toFixed(2),
    discount.toFixed(2),
    tax.toFixed(2),
    delivery_fee.toFixed(2),
    total.toFixed(2),
    delivery_type,
    deliveryDate,
    customer_details.name,
    customer_details.address1,
    customer_details.address2,
    customer_details.city,
    customer_details.state,
    customer_details.zip,
    customer_details.email,
    customer_details.payment_method,
    customer_details.card_number.slice(-4),
    customer_details.card_expiry,
    customer_details.card_cvv,
    store_id || null
  ];

  db.query(orderQuery, orderValues, (err, result) => {
    if (err) {
      console.error("Error placing order:", err.message);
      return res.status(500).json({ message: "Error placing order" });
    }

    // Insert order items into order_items table
    const orderItemsQuery = `INSERT INTO order_items (order_id, product_id, accessory_id, quantity, price) VALUES ?`;
    const orderItemsValues = cart_items.map((item) => [
      result.insertId,
      item.product_id || null,
      item.accessory_id || null,
      item.quantity,
      item.price,
    ]);

    db.query(orderItemsQuery, [orderItemsValues], (err, orderItemsResult) => {
      if (err) {
        console.error("Error adding order items:", err.message);
        return res.status(500).json({ message: "Error placing order items" });
      }

      // Clear the cart for this user
      db.query(
        `DELETE FROM cart WHERE user_id = ?`,
        [user_id],
        (err, clearCartResult) => {
          if (err) {
            console.error("Error clearing cart:", err.message);
            return res.status(500).json({ message: "Error clearing cart" });
          }

          res.status(201).json({
            confirmation_number,
            delivery_date: deliveryDate,
            total: total.toFixed(2),
            store_id,
            discount: discount.toFixed(2), // Include discount in the response
          });
        }
      );
    });
  });
};


exports.getOrderStatus = (req, res) => {
  const { confirmation_number } = req.params;

  const query = `
        SELECT o.*, oi.product_id, oi.accessory_id, oi.quantity, oi.price, 
               p.name AS product_name, p.image AS product_image, p.manufacturer AS product_manufacturer,
               a.name AS accessory_name, a.image AS accessory_image, a.product_id AS accessory_product_id,
               (CASE 
                    WHEN oi.accessory_id IS NOT NULL THEN (SELECT manufacturer FROM products WHERE id = a.product_id) 
                    ELSE p.manufacturer 
               END) AS final_manufacturer,
               o.status -- Include status from the orders table
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN products p ON oi.product_id = p.id
        LEFT JOIN accessories a ON oi.accessory_id = a.id
        WHERE o.confirmation_number = ?
    `;

  db.query(query, [confirmation_number], (err, result) => {
    if (err) {
      console.error("Error fetching order status:", err.message);
      return res.status(500).json({ message: "Error fetching order status" });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Map the result to properly format the response
    const order = {
      order_id: result[0].id,
      user_id: result[0].user_id,
      confirmation_number: result[0].confirmation_number,
      subtotal: result[0].subtotal,
      tax: result[0].tax,
      delivery_fee: result[0].delivery_fee,
      total: result[0].total,
      delivery_date: result[0].delivery_date,
      delivery_type: result[0].delivery_type,
      customer_name: result[0].customer_name,
      address1: result[0].address1, // new field
      address2: result[0].address2, // new field
      city: result[0].city,         // new field
      state: result[0].state,       // new field
      zip: result[0].zip,           // new field
      status: result[0].status,     // Add status here
      items: result.map((item) => ({
        product_id: item.product_id,
        accessory_id: item.accessory_id,
        name: item.product_name || item.accessory_name,
        image: item.product_image || item.accessory_image,
        manufacturer: item.final_manufacturer, // Get the final manufacturer (from product or accessory's product)
        quantity: item.quantity,
        price: item.price,
      })),
    };

    res.json(order);
  });
};


// Cancel an order
exports.cancelOrder = (req, res) => {
  const { confirmation_number } = req.params;

  const query = `
    SELECT delivery_date
    FROM orders
    WHERE confirmation_number = ?
  `;

  db.query(query, [confirmation_number], (err, result) => {
    if (err) {
      console.error("Error fetching order:", err.message);
      return res.status(500).json({ message: "Error fetching order" });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const deliveryDate = new Date(result[0].delivery_date);
    const currentDate = new Date();

    const daysUntilDelivery =
      (deliveryDate - currentDate) / (1000 * 60 * 60 * 24);

    // Only allow cancellation if the delivery date is more than 5 days away
    if (daysUntilDelivery <= 5) {
      return res.status(400).json({
        message: "Order cannot be cancelled within 5 business days of delivery",
      });
    }

    // Delete the order
    const deleteOrderQuery = `DELETE FROM orders WHERE confirmation_number = ?`;
    db.query(deleteOrderQuery, [confirmation_number], (err, result) => {
      if (err) {
        console.error("Error cancelling order:", err.message);
        return res.status(500).json({ message: "Error cancelling order" });
      }

      res.json({ message: "Order cancelled successfully" });
    });
  });
};

// Get all orders for the current user
exports.getOrdersByUserId = (req, res) => {
  const user_id = req.user.id;
  const user_type = req.user.user_type;  // Assuming user_type is included in the token

  let query;
  let params;

  if (user_type === 'sales_man' || user_type === "admin") {
    // If the user is a salesman, fetch all orders for all users
    query = `
      SELECT o.*, s.name as store_name, u.username as customer_name, o.status
      FROM orders o
      LEFT JOIN stores s ON o.store_id = s.id
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `;
    params = [];
  } else {
    // Otherwise, fetch only the orders for the logged-in user
    query = `
      SELECT o.*, s.name as store_name, o.status
      FROM orders o
      LEFT JOIN stores s ON o.store_id = s.id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
    `;
    params = [user_id];
  }

  db.query(query, params, (err, result) => {
    if (err) {
      console.error("Error fetching orders:", err.message);
      return res.status(500).json({ message: "Error fetching orders" });
    }
    
    // Send the response with the fetched data, including the status
    res.json(result);
  });
};


exports.updateOrderStatus = (req, res) => {
  const { confirmation_number } = req.params;
  const { status } = req.body;

  const query = `
    UPDATE orders
    SET status = ?
    WHERE confirmation_number = ?
  `;

  db.query(query, [status, confirmation_number], (err, result) => {
    if (err) {
      console.error('Error updating order status:', err.message);
      return res.status(500).json({ message: 'Error updating order status' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.status(200).json({ message: 'Order status updated successfully' });
  });
};

// Get sales data, zip code order stats, and store pickup stats
exports.getAdminStats = async (req, res) => {
  try {
    // Query for total sold products grouped by category (with a limit of 5)
    const productCategorySalesQuery = `
      SELECT p.category, COUNT(oi.product_id) AS total_sold
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      GROUP BY p.category
      ORDER BY total_sold DESC
      LIMIT 5;
    `;

    // Query for top sold products (with a limit of 5)
    const productSalesQuery = `
      SELECT p.id, p.name, p.price, p.manufacturer, p.image, COUNT(oi.product_id) AS total_sold
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      GROUP BY p.id
      ORDER BY total_sold DESC
      LIMIT 5;
    `;

    // Query for zip code orders based on home delivery type (with a limit of 5)
    const zipCodeOrdersQuery = `
      SELECT o.zip, COUNT(o.id) AS total_orders
      FROM orders o
      WHERE o.delivery_type = 'home_delivery'
      GROUP BY o.zip
      ORDER BY total_orders DESC
      LIMIT 5;
    `;

    // Query for store pickups based on store location
    const storePickupsQuery = `
      SELECT s.name AS store_name, COUNT(o.id) AS total_pickups
      FROM orders o
      JOIN stores s ON o.store_id = s.id
      WHERE o.delivery_type = 'store_pickup'
      GROUP BY s.name
      ORDER BY total_pickups DESC;
    `;

    // Execute the queries
    db.query(productCategorySalesQuery, (err, productCategorySales) => {
      if (err) throw err;

      db.query(productSalesQuery, (err, productSales) => {
        if (err) throw err;

        db.query(zipCodeOrdersQuery, (err, zipCodeOrders) => {
          if (err) throw err;

          db.query(storePickupsQuery, (err, storePickups) => {
            if (err) throw err;

            // Send the aggregated stats back
            res.status(200).json({
              productCategorySales,
              productSales,
              zipCodeOrders,
              storePickups,
            });
          });
        });
      });
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error.message);
    res.status(500).json({ message: "Error fetching admin stats" });
  }
};
