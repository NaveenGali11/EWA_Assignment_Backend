const mongoose = require('mongoose');
require('dotenv').config();

const mongoURI = "<Your Mongo URI HERE>";

const connectDB = async () => {
  try {
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
