const express = require('express');
const router = express.Router();
require('dotenv').config();
const OpenAI = require('openai');
const { Client } = require('@elastic/elasticsearch');
const Product = require('../models/Product');
const Review = require('../models/Review');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const client = new Client({
    node: 'https://localhost:9200',
    auth: {
      username: 'elastic',
      password: 'elastic'
    },
    tls: {
      rejectUnauthorized: false // Skip SSL verification for local setup
    }
});

const fetchProductsFromDB = async () => {
    try {
        const products = await Product.findAll();
        return products; // Returns all products with their details
    } catch (error) {
        console.error('Error fetching products from database:', error.message);
        throw error;
    }
};

const updateProductDescription = async (productId, newDescription) => {
    try {
        // Find the product by its primary key
        const product = await Product.findByPk(productId);

        if (!product) {
            console.log(`Product ID ${productId} not found.`);
            return;
        }

        // Update the product's description
        product.description = newDescription;

        // Save the changes to the database
        await product.save();

        console.log(`Product ID ${productId} description updated successfully.`);
    } catch (error) {
        console.error(`Error updating description for Product ID ${productId}:`, error.message);
        throw error;
    }
};

const storeReviewInMongo = async (product, reviewContent) => {
    try {
        // Use the object fields directly without trying to parse it again
        const { productName, rating, reviewText } = reviewContent;

        if (!rating || !reviewText) {
            throw new Error('Failed to extract rating or review text from generated content.');
        }

        // Create a new review document with only the fields you want to fill
        const reviewDocument = new Review({
            ProductModelName: productName,
            ProductCategory: product.category,
            ProductPrice: product.price,
            ManufacturerName: product.manufacturer_name || '', // If available, otherwise leave empty
            ReviewRating: rating,
            ReviewDate: new Date(), // Store the current date as the review date
            ReviewText: reviewText.trim()
        });

        // Save the review document to MongoDB
        await reviewDocument.save();
        console.log(`Review for product ${product.name} stored successfully in MongoDB.`);
    } catch (error) {
        console.error(`Error storing review for product ${product.name}:`, error.message);
    }
};

const fetchAllReviews = async () => {
    try {
        const reviews = await Review.find({});
        console.log(`Fetched ${reviews.length} reviews from MongoDB.`);
        return reviews;
    } catch (error) {
        console.error('Error fetching reviews:', error.message);
        throw error;
    }
};


const elasticIndexForProduct = async () => {
    try {
        const indexExists = await client.indices.exists({ index: 'product_embeddings' });

        if (indexExists) {
            // Delete the existing index
            await client.indices.delete({ index: 'product_embeddings' });
            console.log('Index deleted: product_embeddings');
        }

        
            await client.indices.create({
                index: 'product_embeddings',
                body: {
                    mappings: {
                        properties: {
                            product_name: { type: 'text' },
                            description: { type: 'text' },
                            price: { type: 'float' },          // Store price as a float
                            category: { type: 'keyword' },     // Store category as a keyword for exact match queries
                            embedding: { type: 'dense_vector', dims: 1536 } // Adjust dimensions based on your embedding model
                        },
                    },
                },
            });
            console.log('Index created: product_embeddings');
    } catch (error) {
        console.error('Error creating index:', error.message);
    }
};

const elasticIndexForProductReview = async () => {
    try {
        const indexExists = await client.indices.exists({ index: 'review_embeddings' });

        if (indexExists) {
            // Delete the existing index
            await client.indices.delete({ index: 'review_embeddings' });
            console.log('Index deleted: review_embeddings');
        }

        // Create a new index for review embeddings
        await client.indices.create({
            index: 'review_embeddings',
            body: {
                mappings: {
                    properties: {
                        review_id: { type: 'keyword' }, // Unique ID for each review
                        product_name: { type: 'text' }, 
                        review_text: { type: 'text' },
                        review_rating: { type: 'float' },
                        embedding: { type: 'dense_vector', dims: 1536 }, // Adjust dimensions as per your embedding model
                    },
                },
            },
        });
        console.log('Index created: review_embeddings');
    } catch (error) {
        console.error('Error creating review index:', error.message);
    }
};


const generateProductDescription = async (productName, category) => {
    const prompt = `
        Write a concise, engaging, and user-focused description (maximum 100 words) for the following SmartHome product:
        - Product Name: ${productName}
        - Category: ${category}
        
        Highlight key features, benefits, compatibility with SmartHome ecosystems, and ease of use.
    `;

    const payload = {
        model: "gpt-4",
        messages: [
            { role: "system", content: "You are an intelligent product description generator for SmartHome devices." },
            { role: "user", content: prompt }
        ]
    };

    try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errorDetails = await res.text();
            console.error(`OpenAI API Error (Status: ${res.status}):`, errorDetails);
            throw new Error(`OpenAI API error: ${res.statusText}`);
        }

        const data = await res.json();
        return data.choices[0].message.content; // The generated description
    } catch (error) {
        console.error('Error generating description:', error.message);
        throw new Error('Failed to generate product description');
    }
};


// Function to generate a product review
const generateReview = async (productName, category) => {
    const positiveKeywords = {
        "Doorbells": ["convenient", "secure", "real-time", "reliable", "clear video"],
        "Doorlocks": ["secure", "convenient", "remote access", "easy install"],
        "Speakers": ["responsive", "good sound", "versatile", "user-friendly"],
        "Lightbulbs": ["customizable", "energy-efficient", "remote control", "mood-enhancing"],
        "Thermostats": ["energy-saving", "easy to use", "efficient", "remote control"]
    };

    const negativeKeywords = {
        "Doorbells": ["glitchy", "slow alerts", "poor connection", "privacy concerns"],
        "Doorlocks": ["battery drain", "app issues", "unreliable", "lock jams"],
        "Speakers": ["poor privacy", "limited commands", "connectivity issues"],
        "Lightbulbs": ["app problems", "delay", "connectivity issues", "limited brightness"],
        "Thermostats": ["difficult setup", "temperature inaccuracy", "app bugs", "connectivity issues"]
    };

    const prompt = `
        Write a detailed and unbiased customer review for the product: ${productName}.
        - Use at most 50 words.
        - Include realistic experiences with both positive and negative aspects.
        - Positive keywords: ${positiveKeywords[category].join(', ')}
        - Negative keywords: ${negativeKeywords[category].join(', ')}

        Provide a rating between 1 and 5 (1 being the worst, 5 being the best).

        Output must strictly follow this format:
        Product Name: [Product Name]
        Rating: [Rating between 1 and 5] out of 5
        Review: [Concise review within 50 words]
        No additional text or deviations from this format.
    `;

    const payload = {
        model: "gpt-4",
        messages: [
            { role: "system", content: "You are a product review generator that writes concise, balanced, and unbiased reviews for SmartHome devices." },
            { role: "user", content: prompt }
        ]
    };

    try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errorDetails = await res.text();
            console.error(`OpenAI API Error (Status: ${res.status}):`, errorDetails);
            throw new Error(`OpenAI API error: ${res.statusText}`);
        }

        const data = await res.json();
        const content = data.choices[0].message.content; // The formatted review

        // Log the AI response for debugging
        console.log("Generated Review Content:", content);

        // Parse fields from response
        const match = content.match(/Product Name: (.+)\nRating: ([0-9]+(?:\.[0-9]+)?) out of 5\nReview: (.+)/s);

        if (match) {
            return {
                productName: match[1].trim(),
                rating: parseInt(match[2], 10),
                reviewText: match[3].trim(),
            };
        } else {
            console.error("Failed to extract fields. AI Response:", content); // Log full response
            throw new Error("Failed to extract rating or review text from generated content.");
        }
    } catch (error) {
        console.error('Error generating review:', error.message);
        throw new Error('Failed to generate product review');
    }
};


const generateAndUpdateDescriptions = async () => {
    try {
        // Step 1: Fetch all products
        const products = await fetchProductsFromDB();

        // Step 2: Loop through products and generate descriptions
        for (const product of products) {
            const description = await generateProductDescription(product.name, product.category);

            // Step 3: Update the database with the new description
            await updateProductDescription(product.product_id, description);
        }

        console.log('All product descriptions updated successfully!');
    } catch (error) {
        console.error('Error updating product descriptions:', error.message);
    }
};


// Generate reviews for products
const generateAndStoreReviews = async () => {
    try {
        // Fetch all products from the database
        const products = await Product.findAll(); // Assuming you're using Sequelize for products

        for (const product of products) {
            // Generate 5 reviews for each product
            for (let i = 0; i < 2; i++) {
                const reviewContent = await generateReview(product.name, product.category);

                // Store the review in MongoDB
                await storeReviewInMongo(product, reviewContent);
            }
        }

        console.log('All reviews generated and stored successfully in MongoDB!');
    } catch (error) {
        console.error('Error generating or storing reviews:', error.message);
    }
};


// Function to generate embeddings for a given text
const generateEmbedding = async (text) => {
    const payload = {
        model: "text-embedding-3-small",  // Specify the embedding model
        input: text
    };

    try {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorDetails = await response.text();
            console.error(`Error: ${response.statusText}`, errorDetails);
            throw new Error(`OpenAI API Error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.data[0].embedding;  // Return the embedding vector
    } catch (error) {
        console.error('Error generating embedding:', error.message);
        throw error;
    }
};

// Function to generate embeddings for all products
const generateProductEmbeddings = async () => {
    const productRecords = await fetchProductsFromDB();

    // create elasticSrarch index before storing productEmbedding in elasticSearch
    elasticIndexForProduct(); 

    const embeddings = [];

    for (const product of productRecords) {
        const text = `
        Product Name: ${product.name}
        Product Price: ${product.price}
        Category: ${product.category}
        Description: ${product.description}
        `;
        const embedding = await generateEmbedding(text);

        // Store the embedding in Elasticsearch
        await storeProductEmbeddingInElastic(product.product_id, product.name, product.description, product.price, product.category, embedding);
    }

    console.log("All embeddings generated and stored.");
    // return embeddings;
};

const storeProductEmbeddingInElastic = async (productId, productName, productDescription, productPrice, productCategory, embedding) => {  

    try {
        await client.index({
            index: 'product_embeddings',
            id: productId, // Use product ID as the document ID
            body: {
                product_id: productId,
                product_name: productName,
                description: productDescription,
                price: productPrice,
                category: productCategory,
                embedding: embedding
            }
        });
        console.log(`Embedding for Product ID ${productId} stored in Elasticsearch.`);
    } catch (error) {
        console.error(`Error storing embedding for ${productName}:`, error.message);
    }
};

// Function to search products in Elasticsearch based on user input
const searchProductsInElasticsearch = async (queryEmbedding, index = 'product_embeddings') => {
    const query = {
        "knn": {
            "field": "embedding",   // Dense vector field in Elasticsearch
            "query_vector": queryEmbedding,  // Query embedding vector
            "k": 5,                  // Number of nearest neighbors to retrieve
            "num_candidates": 100    // Number of candidates to consider (improves precision)
        }
    };

    try {
        // Perform the search query in Elasticsearch
        const response = await client.search({
            index: index,
            body: query,
            size: 5 // Adjust size as needed for the number of results
        });

        // Extract product IDs, names, and descriptions from the search results
        const results = response.hits.hits.map(doc => ({
            id: doc._id,                        // Elasticsearch document ID
            name: doc._source.product_name,     // Product name
            description: doc._source.description, // Product description
            price: doc._source.price,           // Product price
            category: doc._source.category,      // Product category
            score: doc._score
        }));

        return results;

    } catch (error) {
        console.error('Error searching products:', error.message);
        throw new Error('Failed to search products in Elasticsearch.');
    }
};

const generateProductReviewEmbeddings = async () => {
    try {
        // Step 1: Fetch all reviews from MongoDB
        const reviews = await Review.find({});
        console.log(`Fetched ${reviews.length} reviews from MongoDB.`);

        // Step 2: Create Elasticsearch index for reviews
        await elasticIndexForProductReview();

        // Step 3: Loop through each review, generate embeddings, and store them in Elasticsearch
        for (const review of reviews) {
            const reviewText = `
                Product Name: ${review.ProductModelName}
                Review Rating: ${review.ReviewRating} out of 5
                Review Text: ${review.ReviewText}
            `;

            // Generate embedding for the review text
            const embedding = await generateEmbedding(reviewText);

            // Store the review embedding in Elasticsearch
            await storeProductReviewEmbeddingInElastic(
                review._id.toString(),
                review.ProductModelName,
                review.ReviewText,
                review.ReviewRating,
                embedding
            );
        }

        console.log("All review embeddings generated and stored.");
    } catch (error) {
        console.error('Error generating and storing review embeddings:', error.message);
    }
};


const storeProductReviewEmbeddingInElastic = async (reviewId, productName, reviewText, reviewRating, embedding) => {
    try {
        await client.index({
            index: 'review_embeddings',  // Name of the Elasticsearch index for reviews
            id: reviewId,  // Use review ID as the document ID
            body: {
                review_id: reviewId,
                product_name: productName,
                review_text: reviewText,
                review_rating: reviewRating,
                embedding: embedding
            }
        });
        console.log(`Embedding for Review ID ${reviewId} stored in Elasticsearch.`);
    } catch (error) {
        console.error(`Error storing review embedding for ${productName}:`, error.message);
    }
};

// Function to search reviews in Elasticsearch based on user input
const searchReviewsInElasticsearch = async (queryEmbedding, index = 'review_embeddings') => {
    const query = {
        "knn": {
            "field": "embedding",   // Dense vector field in Elasticsearch for review embeddings
            "query_vector": queryEmbedding,  // Query embedding vector
            "k": 5,                  // Number of nearest neighbors to retrieve
            "num_candidates": 100    // Number of candidates to consider for better precision
        }
    };

    try {
        // Perform the search query in Elasticsearch
        const response = await client.search({
            index: index,
            body: query,
            size: 5 // Adjust size as needed for the number of results
        });

        // Extract relevant data from the search results
        const results = response.hits.hits.map(doc => ({
            id: doc._id,                      // Elasticsearch document ID
            product_name: doc._source.product_name,  // Product name
            review_text: doc._source.review_text,    // Review text
            review_rating: doc._source.review_rating, // Review rating
            score: doc._score                   // Similarity score
        }));

        return results;

    } catch (error) {
        console.error('Error searching reviews:', error.message);
        throw new Error('Failed to search reviews in Elasticsearch.');
    }
};


// Route to generate product description using ai
router.get('/productDescriptions', async (req, res) => {
    try {
        await generateAndUpdateDescriptions();
        res.status(200).json({ message: 'Product descriptions generated and updated successfully!' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate descriptions', details: error.message });
    }
});

// Route to generate product embeddings
router.get('/productEmbeddings', async (req, res) => {
    try {
        const productEmbeddings = await generateProductEmbeddings();
        res.status(200).json(productEmbeddings);
    } catch (error) {
        console.error('Error generating product embeddings:', error.message);
        res.status(500).json({ error: 'Failed to generate product embeddings', details: error.message });
    }
});

// Route to handle product search based on user input
router.get('/searchProducts', async (req, res) => {
    const userInput = req.query.q; // Get the user input from query parameter

    if (!userInput) {
        return res.status(400).json({ error: 'Query parameter "q" is required.' });
    }

    try {
        // Step 1: Generate embedding for the user query
        const queryEmbedding = await generateEmbedding(userInput);

        // Step 2: Search Elasticsearch for semantically similar products
        const recommendations = await searchProductsInElasticsearch(queryEmbedding);

        res.status(200).json(recommendations);
    } catch (error) {
        console.error('Error searching products:', error.message);
        res.status(500).json({ error: 'Failed to search products.' });
    }
});

// Route to generate reviews
router.get('/productReviews', async (req, res) => {
    try {
        await generateAndStoreReviews();
        res.status(200).json({ message: 'Reviews generated and stored successfully in MongoDB!' });
    } catch (error) {
        console.error('Error generating reviews:', error.message);
        res.status(500).json({ error: 'Failed to generate reviews', details: error.message });
    }
});

router.get('/productReviewEmbeddings', async (req, res) => {
    try {
        const productReviewEmbeddings = await generateProductReviewEmbeddings();
        res.status(200).json(productReviewEmbeddings);
    } catch (error) {
        console.error('Error generating product review embeddings:', error.message);
        res.status(500).json({ error: 'Failed to generate product review embeddings', details: error.message });
    }
});

// Route to handle review search based on user input
router.get('/searchReviews', async (req, res) => {
    const userInput = req.query.q; // Get the user input from query parameter

    if (!userInput) {
        return res.status(400).json({ error: 'Query parameter "q" is required.' });
    }

    try {
        // Step 1: Generate embedding for the user query
        const queryEmbedding = await generateEmbedding(userInput);

        // Step 2: Search Elasticsearch for semantically similar reviews
        const reviewRecommendations = await searchReviewsInElasticsearch(queryEmbedding);

        res.status(200).json(reviewRecommendations);
    } catch (error) {
        console.error('Error searching reviews:', error.message);
        res.status(500).json({ error: 'Failed to search reviews.' });
    }
});


const generateAndStoreSingleReview = async (productName, category) => {
    try {
        // Log the category for debugging
        console.log(`Generating review for product: ${productName}, Category: ${category}`);

        // Generate a single review for the specified product
        const reviewContent = await generateReview(productName, category);

        // Create a mock product object for testing (minimal fields required)
        const mockProduct = {
            name: productName,
            category: category,
            price: 99.99, // Example price
            manufacturer_name: "Test Manufacturer", // Optional field
        };

        // Store the generated review in MongoDB
        await storeReviewInMongo(mockProduct, reviewContent);

        console.log(`Review for product "${productName}" generated and stored successfully.`);
    } catch (error) {
        console.error('Error during isolated review generation and storage:', error.message);
    }
};

router.get('/testSingleReview', async (req, res) => {
    // const { productName, category } = req.query;

    try {
        await generateAndStoreSingleReview("Amazon Echo", "Speakers");
        res.status(200).json({ message: `Test review for product Amazon Echo generated and stored successfully.` });
    } catch (error) {
        console.error('Error testing single review:', error.message);
        res.status(500).json({ error: 'Failed to generate or store test review.', details: error.message });
    }
});



module.exports = router;
