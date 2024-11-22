const express = require("express");
const {
  addReview,
  getReviewsByProduct,
  updateReview,
  deleteReview,
  processReviews,
  searchReviews,
} = require("../controllers/reviewController");
const { protect } = require("../middlewares/authMiddleware");
const router = express.Router();

router.get("/processReviews", processReviews);

router.post("/searchReviews", searchReviews);

// POST /reviews/:productId - Add a review for a product
router.post("/:productId", protect, addReview);

// GET /reviews/:productId - Get reviews for a product
router.get("/:productId", getReviewsByProduct);

// PUT /reviews/:reviewId - Update a review
router.put("/:reviewId", updateReview);

// DELETE /reviews/:reviewId - Delete a review
router.delete("/:reviewId", deleteReview);

module.exports = router;
