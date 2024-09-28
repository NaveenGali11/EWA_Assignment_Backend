const Review = require('../models/reviewModel');
const db = require("../config/db");

exports.addReview = async (req, res) => {
  try {
    const { rating, comment, orderid, price } = req.body;
    const { productId } = req.params;
    const userId = req.user.id;
    const userName = req.user.username;

    console.log("USER :_ ",req.user);
    

    // Validate required fields
    if (!rating || !comment || !price || !orderid) {
      return res.status(400).json({ message: 'Rating, comment, order id, manufacturer, and price are required' });
    }

    // Create the new review object
    const newReview = new Review({
      product_id: productId,
      user_id: userId,
      username: userName,
      order_id: orderid, 
      price: price,
      rating: rating,
      comment: comment,
    });

    // Save the review in the database
    await newReview.save();
    res.status(201).json({ message: 'Review added successfully' });
  } catch (error) {
    console.error("Error adding review:", error);
    res.status(500).json({ message: 'Error adding review', error: error.message });
  }
};


// Get reviews for a product
exports.getReviewsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const reviews = await Review.find({ product_id: productId });
    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reviews', error: error.message });
  }
};

// Update a review
exports.updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;

    const updatedReview = await Review.findByIdAndUpdate(
      reviewId,
      { rating, comment },
      { new: true }
    );

    if (!updatedReview) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.status(200).json({ message: 'Review updated successfully', updatedReview });
  } catch (error) {
    res.status(500).json({ message: 'Error updating review', error: error.message });
  }
};

// Delete a review
exports.deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const deletedReview = await Review.findByIdAndDelete(reviewId);

    if (!deletedReview) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.status(200).json({ message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting review', error: error.message });
  }
};

