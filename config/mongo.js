const mongoose = require('mongoose');
require('dotenv').config();

const mongoURI = 'mongodb+srv://naveengali80:ywPoMsI7qNM7jLdB@firstcluster.qjv32.mongodb.net/?retryWrites=true&w=majority&appName=FirstCluster';

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
