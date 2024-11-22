const Review = require("../models/reviewModel");
const db = require("../config/db");
const OpenAI = require("openai");
const { Client } = require("@elastic/elasticsearch");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const esClient = new Client({ node: "http://localhost:9200" });

exports.addReview = async (req, res) => {
  try {
    const { rating, comment, orderid, price } = req.body;
    const { productId } = req.params;
    const userId = req.user.id;
    const userName = req.user.username;

    console.log("USER :_ ", req.user);

    // Validate required fields
    if (!rating || !comment || !price || !orderid) {
      return res.status(400).json({
        message:
          "Rating, comment, order id, manufacturer, and price are required",
      });
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
    res.status(201).json({ message: "Review added successfully" });
  } catch (error) {
    console.error("Error adding review:", error);
    res
      .status(500)
      .json({ message: "Error adding review", error: error.message });
  }
};

// Get reviews for a product
exports.getReviewsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const reviews = await Review.find({ product_id: productId });
    res.status(200).json(reviews);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching reviews", error: error.message });
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
      return res.status(404).json({ message: "Review not found" });
    }

    res
      .status(200)
      .json({ message: "Review updated successfully", updatedReview });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating review", error: error.message });
  }
};

// Delete a review
exports.deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const deletedReview = await Review.findByIdAndDelete(reviewId);

    if (!deletedReview) {
      return res.status(404).json({ message: "Review not found" });
    }

    res.status(200).json({ message: "Review deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting review", error: error.message });
  }
};

const categoryKeywords = {
  doorbells: {
    positive: ["convenient", "secure", "real-time", "reliable", "clear video"],
    negative: ["glitchy", "slow alerts", "poor connection", "privacy concerns"],
  },
  doorlocks: {
    positive: ["secure", "convenient", "remote access", "easy install"],
    negative: ["battery drain", "app issues", "unreliable", "lock jams"],
  },
  speakers: {
    positive: ["responsive", "good sound", "versatile", "user-friendly"],
    negative: ["poor privacy", "limited commands", "connectivity issues"],
  },
  lightings: {
    positive: [
      "customizable",
      "energy-efficient",
      "remote control",
      "mood-enhancing",
    ],
    negative: [
      "app problems",
      "delay",
      "connectivity issues",
      "limited brightness",
    ],
  },
  thermostats: {
    positive: ["energy-saving", "easy to use", "efficient", "remote control"],
    negative: [
      "difficult setup",
      "temperature inaccuracy",
      "app bugs",
      "connectivity issues",
    ],
  },
};

exports.processReviews = async (req, res) => {
  try {
    console.log("[INFO] Starting review processing...");

    // Step 1: Fetch products from MySQL
    const query = "SELECT id, name, category, price FROM products";
    const products = await new Promise((resolve, reject) => {
      db.query(query, (err, result) => (err ? reject(err) : resolve(result)));
    });
    console.log(`[INFO] Fetched ${products.length} products from MySQL.`);

    // Step 2: Generate reviews for each product and insert into MongoDB
    const allGeneratedReviews = [];
    for (const product of products) {
      const { id: productId, name: productName, category, price } = product;

      if (!categoryKeywords[category]) {
        console.warn(
          `[WARN] No keywords for category ${category}, skipping product.`
        );
        continue;
      }

      const keywords = categoryKeywords[category];
      const sentiments = [
        { type: "positive", ratings: [4, 5], keywords: keywords.positive },
        { type: "negative", ratings: [1, 2], keywords: keywords.negative },
      ];

      for (let i = 0; i < 5; i++) {
        const sentiment = sentiments[i % 2];
        const reviewPrompt = `Write a ${
          sentiment.type
        } review for a ${category} product named '${productName}'. Use keywords: ${sentiment.keywords.join(
          ", "
        )}. Give me in a single paragraph without the stars or any other special characters other than the text characters.`;

        let comment;
        const rating =
          sentiment.ratings[
            Math.floor(Math.random() * sentiment.ratings.length)
          ];
        try {
          const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: "Generate product reviews." },
              { role: "user", content: reviewPrompt },
            ],
          });
          comment = response.choices[0].message.content.trim();
          console.log("COMMENT :_ ", comment);
        } catch (err) {
          console.error(
            `[ERROR] Failed to generate review for product ${productName}:`,
            err
          );
          comment = "Error generating review.";
        }

        allGeneratedReviews.push({
          product_id: productId,
          user_id: `user-${Math.random().toString(36).substr(2, 9)}`,
          username: `Anonymous User`,
          order_id: `order-${Math.random().toString(36).substr(2, 9)}`,
          price: parseFloat(price),
          rating,
          comment,
        });
      }
    }

    console.log("[INFO] Generated reviews for all products.");
    console.log("Generated Reviews length :- ", allGeneratedReviews.length);

    // Insert generated reviews into MongoDB
    const insertResult = await Review.insertMany(allGeneratedReviews);
    console.log(
      `[INFO] Inserted ${insertResult} generated reviews into MongoDB.`
    );

    // Step 3: Fetch all reviews (user-generated + AI-generated) from MongoDB
    const allReviews = await Review.find({});
    console.log(`[INFO] Retrieved ${allReviews.length} reviews from MongoDB.`);

    // Step 4: Generate embeddings for all reviews
    const reviewsWithEmbeddings = [];
    for (const review of allReviews) {
      try {
        const embedding = await generateEmbedding(review.comment);
        console.log("Embedding :- ", embedding);
        reviewsWithEmbeddings.push({
          ...review,
          embedding,
        });
      } catch (err) {
        console.error(
          `[ERROR] Failed to generate embedding for review ID ${review._id}:`,
          err
        );
      }
    }
    console.log("[INFO] Generated embeddings for all reviews.");

    // Step 5: Push reviews with embeddings to Elasticsearch
    const bulkData = reviewsWithEmbeddings.flatMap((review) => [
      { index: { _index: "review_embeddings", _id: review._id } },
      {
        product_id: review.product_id,
        user_id: review.user_id,
        username: review.username,
        order_id: review.order_id,
        price: review.price,
        rating: review.rating,
        comment: review.comment,
        embedding: review.embedding,
      },
    ]);

    const esResponse = await esClient.bulk({ body: bulkData });
    console.log(`[INFO] Elasticsearch bulk response:`, esResponse);

    res
      .status(200)
      .json({ message: "Reviews and embeddings processed successfully." });
  } catch (err) {
    console.error("[ERROR] Error processing reviews:", err);
    res.status(500).json({ error: "Failed to process reviews." });
  }
};

// Helper function to generate embeddings
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return response.data[0].embedding;
  } catch (err) {
    console.error("[ERROR] Failed to generate embedding:", err);
    throw err;
  }
}

exports.searchReviews = async (req, res) => {
  try {
    const { queryText, productId } = req.body;

    if (!queryText || !productId) {
      return res.status(400).json({
        message: "queryText and productId are required for searching reviews.",
      });
    }

    console.log("[INFO] Generating embedding for query text...");
    const queryEmbedding = await generateEmbedding(queryText);

    console.log("[INFO] Performing semantic search in Elasticsearch...");
    const response = await esClient.search({
      index: "review_embeddings",
      body: {
        knn: {
          field: "embedding", // Dense vector field for semantic search
          query_vector: queryEmbedding, // Query embedding
          k: 10, // Number of nearest neighbors
          num_candidates: 50, // Broaden candidate pool
        },
        query: {
          bool: {
            must: [
              {
                term: {
                  "product_id.keyword": productId, // Filter by product ID
                },
              },
            ],
          },
        },
        size: 4,
        _source: {
          includes: [
            "product_id",
            "user_id",
            "username",
            "order_id",
            "price",
            "rating",
            "comment",
          ],
        },
      },
    });

    // Debugging: Log scores and embeddings
    console.log("[DEBUG] Query embedding:", queryEmbedding);
    console.log(
      "[DEBUG] Raw Elasticsearch response:",
      JSON.stringify(response, null, 2)
    );

    const results = response.hits.hits.map((hit) => ({
      id: hit._id,
      product_id: hit._source.product_id,
      user_id: hit._source.user_id,
      username: hit._source.username,
      order_id: hit._source.order_id,
      price: hit._source.price,
      rating: hit._source.rating,
      comment: hit._source.comment,
      score: hit._score, // Relevance score from Elasticsearch
    }));

    if (results.length === 0) {
      console.log("[INFO] No results found for the query.");
      return res
        .status(404)
        .json({ message: "No reviews found for the query." });
    }

    console.log("[INFO] Search results:", results);

    res.status(200).json({
      count: results.length,
      results,
    });
  } catch (err) {
    console.error("[ERROR] Error performing semantic search:", err);
    res.status(500).json({
      message: "Failed to perform semantic search.",
      error: err.message,
    });
  }
};
