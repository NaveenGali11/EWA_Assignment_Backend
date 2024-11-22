const OpenAI = require('openai');
const db = require("../config/db");
const path = require("path");
const multer = require("multer");
const {readFileSync} = require("node:fs");
const {imgurUploadImage} = require("../services/imgur");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

function generateTicketId() {
    const timestamp = Date.now(); // Get current timestamp
    const random = Math.floor(Math.random() * 1000); // Generate a random number between 0 and 999
    return `${timestamp}${random}`; // Concatenate timestamp and random number
}

// Set up multer for file storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/"); // Destination folder
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Filename with timestamp
    },
});

// Initialize multer upload function
const upload = multer({ storage: storage }).single("image");

// Function to call OpenAI API for image analysis with a specific prompt
async function analyzeImage(imagePath,description) {
    const imageData = readFileSync(imagePath, { encoding: 'base64' });

    // This is a customer service request related to a product. The user provided the following description: "${description}".

    const prompt = `
        This is a customer service request related to a product. The user provided the following description: "${description}".
    
        Based on the image and description, please determine whether the customer request should result in:
        1. Refund: If the product appears damaged or defective.
        2. Replace: If the product is incorrect (e.g., wrong product shipped).
        3. Escalate: If the description does not indicate clear damage or the wrong product.

        Please respond with the appropriate action: Refund, Replace, or Escalate.
        Give me only one small answer as either Refund, Replace, or Escalate.
    `;

    try {
        // const response = await axios.post("https://api.openai.com/v1/completions", {
        //     image: imageData,
        //     prompt: prompt,
        //     model: "gpt-4o-mini",  // Adjust the model name as needed
        //     max_tokens: 100
        // }, {
        //     headers: {
        //         "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        //         "Content-Type": "application/json",
        //     },
        // }).then((res) => {
        //     console.log("RES :_ ",response.data);
        // }, (err) => {
        //     console.log("ERR :_ ",err.message);
        // })

        console.log("Image Data :- ", imageData);
       const imageUrl =  await imgurUploadImage(imageData);

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: prompt
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: imageUrl,
                            }
                        }
                    ]
                }
            ]
        });

        console.log("RES :_ ",response.choices[0]);
        console.log("RES :_ ",response.choices[0].message.content);


        // Parse the response and return the classification
        return response.choices[0].message.content;

    } catch (error) {
        console.error("Error analyzing image with OpenAI:", error.message);
        return 'Escalate'; // Fallback to escalate if the analysis fails
    }
}
exports.createTicket = (req, res) => {
    upload(req, res, async function (err) {
        console.log("Upload Called");
        if (err) {
            console.error("Error uploading image:", err.message);
            return res.status(500).json({ message: "Error uploading image" });
        }

        const { description } = req.body;
        const image = req.file ? req.file.filename : null;
        const userId = req.user.id; // Retrieved from the authenticated user

        if (!description || !image) {
            return res.status(400).json({ message: "Description and image are required" });
        }

        const imagePath = path.join(__dirname, "../uploads/", image);

        // Analyze the uploaded image
        const ticketStatus = await analyzeImage(imagePath, description);

        // Generate a unique ticket ID using your custom function
        const ticketId = generateTicketId();

        // Create the ticket with the analyzed status and unique ticket ID
        const query = `
            INSERT INTO customer_service_tickets (ticket_id, user_id, description, image_url, status)
            VALUES (?, ?, ?, ?, ?)
        `;

        db.query(query, [ticketId, userId, description, image, ticketStatus], (err, result) => {
            if (err) {
                console.error("Error creating ticket:", err.message);
                return res.status(500).json({ message: "Error creating ticket" });
            }

            return res.status(201).json({
                message: "Ticket created successfully",
                ticket_id: ticketId, // Returning the generated ticket ID
                status: ticketStatus,
            });
        });
    });
};


// Get the status of a ticket by ID
exports.getTicketStatus = (req, res) => {
    const { ticket_id } = req.params;

    const query = "SELECT * FROM customer_service_tickets WHERE ticket_id = ?";

    db.query(query, [ticket_id], (err, result) => {
        if (err) {
            console.error("Error fetching ticket:", err.message);
            return res.status(500).json({ message: "Error fetching ticket" });
        }

        if (result.length === 0) {
            return res.status(404).json({ message: "Ticket not found" });
        }

        return res.json({
            ticket_id: result[0].ticket_id,
            description: result[0].description,
            image_url: result[0].image_url ? `http://localhost:5001/uploads/${result[0].image_url}` : null,
            status: result[0].status,
            created_at: result[0].created_at,
        });
    });
};