const express = require('express');
const mongoose = require('mongoose');
const Thirukkural = require('./Thirukkural');
const cors = require('cors');
const { spawn } = require('child_process'); // Use spawn instead of exec
const path = require('path');

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
        const { chapterName, sectionName, verse, translation, explanation } = req.query;

        // Initialize pythonScriptArgs here
        let pythonScriptArgs = [];

        if (chapterName) pythonScriptArgs.push(chapterName, "chapterName");
        if (sectionName) pythonScriptArgs.push(sectionName, "sectionName");
        if (verse) pythonScriptArgs.push(verse,"verse");
        if (translation) pythonScriptArgs.push(`"${translation}"`, `"translation"`);
        if (explanation) pythonScriptArgs.push(`"${explanation}"`, `"explanation"`);

        if (pythonScriptArgs.length === 0) {
            return res.status(400).json({ message: 'No valid query parameters provided' });
        }

        // Execute the Python script using spawn
        const pythonScriptPath = path.join(__dirname, 'test.py');
        const pythonProcess = spawn('python', [pythonScriptPath, ...pythonScriptArgs]);

        let output = '';
        let errorOutput = '';
        console.log('Python script args:', pythonScriptArgs);
        pythonProcess.stdout.on('data', (data) => {
            output += data.toString().trim(); 
        });

        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString().trim(); 
        });

        pythonProcess.on('close', async (code) => {
            if (code !== 0) {
                console.error('Python script exited with code:', code);
                console.error('Error output:', errorOutput);
                return res.status(500).json({ message: 'Error executing Python script', error: errorOutput });
            }
        
            // Parse the output of the Python script
            try {
                const result = JSON.parse(output);
        
                if (result.error) {
                    return res.status(500).json({ message: 'Error from Python script', error: result.error });
                }
        
                const numbers = result.numbers;
                if (!numbers || numbers.length === 0) {
                    return res.status(404).json({ message: 'No Kural details found for the given parameters' });
                }
        
                // Fetch Kural details from MongoDB
                const kurals = await Thirukkural.find({ number: { $in: numbers } });
        
                if (kurals.length === 0) {
                    return res.status(404).json({ message: 'No Kural details found for the given numbers' });
                }
        
                res.status(200).json(kurals);
            } catch (parseError) {
                console.error('Error parsing Python script output:', parseError);
                res.status(500).json({ message: 'Error parsing Python script output', error: parseError.message });
            }
        });
        
    } catch (error) {
        console.error('Error handling request:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});


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
