const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  product_id: {
    type: String,
    required: true,
  },
  user_id: {
    type: String,
    required: true,
  },
  username: {
    type: String,  // Storing the user's name
    required: true,
  },
  order_id: {
    type: String,  // Storing the order id
    required: true,
  },
  price: {
    type: Number,  // Price of the product at the time of purchase
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
