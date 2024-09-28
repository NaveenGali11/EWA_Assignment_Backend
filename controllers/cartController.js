const db = require("../config/db");

// Add a product or accessory to the cart
exports.addToCart = (req, res) => {
  const user_id = req.user.id;  // Get user_id from the JWT token
  const { product_id, accessory_id, quantity } = req.body;  // Both product_id and accessory_id are present

  let checkItemQuery;

  // Dynamically set the query and field based on whether it's a product or accessory
  if (accessory_id) {
      checkItemQuery = 'SELECT * FROM accessories WHERE id = ?';  // Accessory-specific query
  } else {
      checkItemQuery = 'SELECT * FROM products WHERE id = ?';  // Product-specific query
  }

  // Check if the product or accessory exists in the respective table
  db.query(checkItemQuery, [accessory_id || product_id], (err, itemResult) => {
      if (err || itemResult.length === 0) {
          console.error('Item not found:', err ? err.message : 'No matching item');
          return res.status(404).json({ message: 'Item not found' });
      }

      // Check if the item is already in the cart
      const checkCartQuery = `
          SELECT * FROM cart WHERE user_id = ? AND (product_id = ? OR accessory_id = ?)
      `;

      db.query(checkCartQuery, [user_id, product_id || null, accessory_id || null], (err, cartResult) => {
          if (err) {
              console.error('Error checking cart:', err.message);
              return res.status(500).json({ message: 'Error checking cart' });
          }

          if (cartResult.length > 0) {
              // If product or accessory is already in the cart, update the quantity
              const newQuantity = cartResult[0].quantity + quantity;
              const updateCartQuery = `
                  UPDATE cart SET quantity = ? WHERE user_id = ? AND (product_id = ? OR accessory_id = ?)
              `;
              db.query(updateCartQuery, [newQuantity, user_id, product_id || null, accessory_id || null], (err, result) => {
                  if (err) {
                      console.error('Error updating cart item:', err.message);
                      return res.status(500).json({ message: 'Error updating cart item' });
                  }
                  return res.status(200).json({ message: 'Cart item updated successfully' });
              });
          } else {
              // If product or accessory is not in the cart, add it with the actual product_id/accessory_id
              const addToCartQuery = `
                  INSERT INTO cart (user_id, product_id, accessory_id, quantity)
                  VALUES (?, ?, ?, ?)
              `;
              db.query(addToCartQuery, [user_id, product_id || null, accessory_id || null, quantity], (err, result) => {
                  if (err) {
                      console.error('Error adding item to cart:', err.message);
                      return res.status(500).json({ message: 'Error adding item to cart' });
                  }
                  return res.status(201).json({ message: 'Product or accessory added to cart successfully' });
              });
          }
      });
  });
};

// // Get all cart items for a user (including accessories)
// exports.getCartByUserId = (req, res) => {
//   const user_id = req.user.id;  // Get user_id from the JWT token

//   // Query to retrieve products and accessories along with their images from the cart
//   const query = `
//     SELECT cart.id, products.id AS product_id, products.name AS product_name, 
//            accessories.id AS accessory_id, accessories.name AS accessory_name,
//            products.price AS product_price, accessories.price AS accessory_price, 
//            products.image AS product_image, accessories.image AS accessory_image,
//            cart.quantity
//     FROM cart
//     LEFT JOIN products ON cart.product_id = products.id
//     LEFT JOIN accessories ON cart.accessory_id = accessories.id
//     WHERE cart.user_id = ?
//   `;

//   db.query(query, [user_id], (err, result) => {
//     if (err) {
//       console.error('Error fetching cart items:', err.message);
//       return res.status(500).json({ message: 'Error fetching cart items' });
//     }

//     // Calculate the total price and prepare the response
//     let subtotal = 0;
//     const items = result.map(item => {
//       let name, price, imageUrl;

//       if (item.product_id) {
//         // It's a product
//         name = item.product_name;
//         price = item.product_price;
//         imageUrl = item.product_image; // Use the product image
//       } else if (item.accessory_id) {
//         // It's an accessory
//         name = item.accessory_name;
//         price = item.accessory_price;
//         imageUrl = item.accessory_image; // Use the accessory image
//       }

//       // Calculate subtotal
//       subtotal += price * item.quantity;

//       // Return the item details including the imageUrl
//       return {
//         id: item.product_id || item.accessory_id,  // Use the correct product_id or accessory_id
//         name: name,
//         price: price,
//         quantity: item.quantity,
//         item_type: item.product_id ? 'Product' : 'Accessory',
//         imageUrl: imageUrl  // Include imageUrl in the response
//       };
//     });

//     const tax = subtotal * 0.02;  // 2% tax
//     const deliveryFee = subtotal * 0.01;  // 1% delivery fee
//     const total = subtotal + tax + deliveryFee;

//     return res.json({
//       items,
//       subtotal: subtotal.toFixed(2),
//       tax: tax.toFixed(2),
//       delivery_fee: deliveryFee.toFixed(2),
//       total: total.toFixed(2)
//     });
//   });
// };

// Get all cart items for a user (including accessories)
exports.getCartByUserId = (req, res) => {
  const user_id = req.user.id;  // Get user_id from the JWT token

  // Query to retrieve products and accessories along with their images from the cart
  const query = `
    SELECT cart.id, products.id AS product_id, products.name AS product_name, 
           accessories.id AS accessory_id, accessories.name AS accessory_name,
           products.price AS product_price, accessories.price AS accessory_price, 
           products.image AS product_image, accessories.image AS accessory_image,
           cart.quantity
    FROM cart
    LEFT JOIN products ON cart.product_id = products.id
    LEFT JOIN accessories ON cart.accessory_id = accessories.id
    WHERE cart.user_id = ?
  `;

  db.query(query, [user_id], (err, result) => {
    if (err) {
      console.error('Error fetching cart items:', err.message);
      return res.status(500).json({ message: 'Error fetching cart items' });
    }

    // Calculate the total price and prepare the response
    let subtotal = 0;
    const items = result.map(item => {
      let name, price, imageUrl;

      if (item.product_id) {
        // It's a product
        name = item.product_name;
        price = item.product_price;
        imageUrl = item.product_image; // Use the product image
      } else if (item.accessory_id) {
        // It's an accessory
        name = item.accessory_name;
        price = item.accessory_price;
        imageUrl = item.accessory_image; // Use the accessory image
      }

      // Calculate subtotal
      subtotal += price * item.quantity;

      // Return the item details including the imageUrl
      return {
        id: item.product_id || item.accessory_id,  // Use the correct product_id or accessory_id
        name: name,
        price: price,
        quantity: item.quantity,
        item_type: item.product_id ? 'Product' : 'Accessory',
        imageUrl: imageUrl  // Include imageUrl in the response
      };
    });

    // Apply discount if subtotal is greater than $70
    let discount = 0;
    if (subtotal >= 70) {
      discount = subtotal * 0.03;  // 3% discount
      subtotal -= discount;
    }

    // Apply the tax and delivery fee calculations
    const tax = subtotal * 0.02;  // 2% tax
    const deliveryFee = subtotal * 0.01;  // 1% delivery fee
    const total = subtotal + tax + deliveryFee;

    // Send the response back with cart details and totals
    return res.json({
      items,
      subtotal: subtotal.toFixed(2),
      discount: discount.toFixed(2),  // Show the discount applied
      tax: tax.toFixed(2),
      delivery_fee: deliveryFee.toFixed(2),
      total: total.toFixed(2)
    });
  });
};


// Update the quantity of a cart item using product_id or accessory_id
exports.updateCartItem = (req, res) => {
  const { id } = req.params; // This will be either product_id or accessory_id
  const { quantity } = req.body;

  // Log the incoming id and quantity for debugging
  console.log('Updating cart item with product/accessory id:', id, 'and quantity:', quantity);

  if (quantity <= 0) {
    return res.status(400).json({ message: 'Quantity must be greater than 0' });
  }

  // Check if the item exists in the cart using product_id or accessory_id
  const checkQuery = `SELECT * FROM cart WHERE (product_id = ? OR accessory_id = ?)`;
  db.query(checkQuery, [id, id], (err, cartResult) => {
    if (err) {
      console.error('Error fetching cart item:', err.message);
      return res.status(500).json({ message: 'Error fetching cart item' });
    }

    if (cartResult.length === 0) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    // Update quantity in the cart using product_id or accessory_id
    const updateQuery = `UPDATE cart SET quantity = ? WHERE (product_id = ? OR accessory_id = ?)`;
    db.query(updateQuery, [quantity, id, id], (err, result) => {
      if (err) {
        console.error('Error updating cart item quantity:', err.message);
        return res.status(500).json({ message: 'Error updating cart item quantity' });
      }

      return res.status(200).json({ message: 'Cart item quantity updated successfully' });
    });
  });
};

// Remove an item from the cart using product_id or accessory_id
exports.removeFromCart = (req, res) => {
  const { id } = req.params; // This will be either product_id or accessory_id

  console.log('Removing cart item with product/accessory id:', id);

  // Remove the cart item based on product_id or accessory_id
  const query = `
    DELETE FROM cart WHERE (product_id = ? OR accessory_id = ?)
  `;

  db.query(query, [id, id], (err, result) => {
    if (err) {
      console.error('Error removing cart item:', err.message);
      return res.status(500).json({ message: 'Error removing cart item' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    return res.status(200).json({ message: 'Cart item removed successfully' });
  });
};
