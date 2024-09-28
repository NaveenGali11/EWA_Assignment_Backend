const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const accessoryRoutes = require("./routes/accessoryRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const storeRoutes = require("./routes/storeRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const cors = require("cors");
const connectMongoDb = require("./config/mongo");
const connectDB = require("./config/mongo");

// Load environment variables
dotenv.config();

const app = express();

// Middleware to parse JSON requests
app.use(express.json());

app.use(cors());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000"); // Adjust as needed
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

connectDB();

// Serve static files from the uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Auth routes
app.use("/auth", authRoutes);

// Product routes
app.use("/products", productRoutes);

app.use("/orders", orderRoutes);

app.use("/stores", storeRoutes);

app.use("/review", reviewRoutes);

app.use(accessoryRoutes);

app.use(cartRoutes);

// Root route
app.get("/", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.send("API is running...");
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
