const express = require('express');
const mongoose = require('mongoose');
const Thirukkural = require('./Thirukkural');
const cors = require("cors");
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load the dataset embeddings from embedded_file.json
let embeddedData = [];

const loadEmbeddings = () => {
    try {
        const filePath = path.join(__dirname, 'embedded_file.json'); // Update with your file path
        const fileData = fs.readFileSync(filePath);
        embeddedData = JSON.parse(fileData);
        console.log('Embeddings loaded successfully');
    } catch (error) {
        console.error('Error loading embeddings file:', error);
    }
};

loadEmbeddings();

// Custom implementation of cosine similarity if needed
const cosineSimilarity = (vecA, vecB) => {
    const dotProduct = vecA.reduce((sum, value, index) => sum + value * vecB[index], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, value) => sum + value * value, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, value) => sum + value * value, 0));
    return dotProduct / (magnitudeA * magnitudeB);
};

const app = express();
const port = 5000;

// Middleware to handle CORS
app.use(cors());

// Connect to MongoDB with error handling
mongoose.connect('mongodb://127.0.0.1:27017/thirukkural', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('MongoDB connected successfully');
}).catch((error) => {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1); // Exit the process if the connection fails
});

// Middleware
app.use(express.json());

// Endpoint to get Kural details based on query parameters
app.get('/api/kurals', async (req, res) => {
    try {
        const query = {};
        const { chapterName, sectionName, verse, translation, explanation, number } = req.query;

        // Validate query parameters
        if (number && isNaN(parseInt(number, 10))) {
            return res.status(400).json({ message: 'Invalid number format' });
        }

        // Build the query object based on provided parameters
        if (chapterName) query.chapterName = chapterName;
        if (sectionName) query.sectionName = sectionName;
        if (verse) query.verse = verse;
        if (translation) query.translation = translation;
        if (explanation) query.explanation = explanation;
        if (number) query.number = parseInt(number, 10);

        // Find the records in the database
        const kurals = await Thirukkural.find(query);

        if (kurals.length === 0) {
            return res.status(404).json({ message: 'No Kural details found for the given parameters' });
        }

        res.status(200).json(kurals);
    } catch (error) {
        console.error('Error retrieving Kural details:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Endpoint for embedding user input and comparing with dataset
app.post('/api/compare', async (req, res) => {
    try {
        const { text, field } = req.body;

        if (!text || !field) {
            return res.status(400).json({ message: 'Text and field are required' });
        }

        // Run the Python script to generate embedding for user input
        exec(`python3 test.py "${text}" "${field}"`, (error, stdout, stderr) => {
            if (error) {
                console.error('Error executing Python script:', error);
                return res.status(500).json({ message: 'Error processing input' });
            }

            if (stderr) {
                console.error('Python script stderr:', stderr);
                return res.status(500).json({ message: 'Error processing input' });
            }

            // Parse the output from Python script
            const { embeddings } = JSON.parse(stdout);

            // Compare embeddings and get the most similar records
            const results = compareEmbeddings(embeddings, field);

            res.status(200).json(results);
        });
    } catch (error) {
        console.error('Error in /api/compare:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

function compareEmbeddings(userEmbeddings, userField) {
    return embeddedData.map(doc => {
        // Compare the specified field only
        const fieldEmbeddings = doc.embeddings[userField] || [];
        const similarity = cosineSimilarity(userEmbeddings, fieldEmbeddings);
        
        return {
            ...doc,
            similarity
        };
    }).sort((a, b) => {
        // Sort based on the highest similarity
        return b.similarity - a.similarity;
    });
}

// Middleware to handle 404 errors
app.use((req, res, next) => {
    res.status(404).json({ message: 'Endpoint not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ message: 'Internal server error' });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
