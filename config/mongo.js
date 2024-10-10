const mongoose = require("mongoose");
require("dotenv").config(); // Load environment variables from .env file

// Build the MongoDB URI using environment variables
const mongoURI = `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_HOST}/?retryWrites=true&w=majority&appName=${process.env.MONGO_APPNAME}`;

const connectDB = async () => {
  try {
    // Remove deprecated options
    await mongoose.connect(mongoURI);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
