const express = require('express');
const mongoose = require('mongoose');
const Questions = require('./Questions'); // Adjust the path as needed
const Thirukkural = require('./Thirukkural'); // Adjust the path as needed
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const port = 5000;

// Middleware to handle CORS
app.use(cors());

// Connect to MongoDB with error handling
mongoose.connect('mongodb://127.0.0.1:27017/CHATBOT', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('MongoDB connected successfully');
}).catch((error) => {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
});

// Middleware
app.use(express.json());

// Endpoint to get questions based on inputs
app.get('/api/questions', async (req, res) => {
    const { inputs, english_input,selectedLanguage } = req.query;

    // Validate the input
    if (!inputs && !english_input) {
        return res.status(400).json({ message: 'No valid inputs provided' });
    }
    
    let pythonScriptArgs = [];
    
    if (inputs) pythonScriptArgs.push(inputs, "inputs");
    if (english_input) pythonScriptArgs.push(english_input, "english_input");
    if (selectedLanguage) pythonScriptArgs.push(selectedLanguage);
    
    console.log('Python script args:', pythonScriptArgs);

    const pythonScriptPath = path.join(__dirname, 'test2.py');
    const pythonProcess = spawn('python', [pythonScriptPath, ...pythonScriptArgs]);
    console.log('Python script path:', pythonScriptPath);

    let output = '';
    let errorOutput = '';

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
            const numbers = result.numbers;  // Ensure that your Python script returns a list of numbers

            if (!numbers || numbers.length === 0) {
                return res.status(404).json({ message: 'No questions found for the given inputs' });
            }

            // Fetch questions based on the numbers returned
            const questions = await Questions.find({ number: { $in: numbers } });

            if (questions.length === 0) {
                return res.status(404).json({ message: 'No questions found for the given numbers' });
            }

           

        } catch (parseError) {
            console.error('Error parsing Python script output:', parseError);
            res.status(500).json({ message: 'Error parsing Python script output', error: parseError.message });
        }
    });
});

app.get('/api/kurals', async (req, res) => {
    try {
        const {  selectedLanguage,chapterName, sectionName, verse, translation, explanation, Chapter, Chapter_Eng, section_eng, section_trans } = req.query;

        // Validate input query parameters
        if (!chapterName && !sectionName && !verse && !translation && !explanation && !Chapter_Eng && !section_eng && !section_trans && !Chapter) {
            return res.status(400).json({ message: 'No valid query parameters provided' });
        }

        // Initialize pythonScriptArgs
        let pythonScriptArgs = [];
        if (selectedLanguage) pythonScriptArgs.push(selectedLanguage); 
        if (chapterName) pythonScriptArgs.push(chapterName, "chapterName");
        if (sectionName) pythonScriptArgs.push(sectionName, "sectionName");
        if (verse) pythonScriptArgs.push(verse, "verse");
        if (translation) pythonScriptArgs.push(translation, "translation");
        if (explanation) pythonScriptArgs.push(explanation, "explanation");
        if (Chapter) pythonScriptArgs.push(Chapter, "Chapter");
        if (Chapter_Eng) pythonScriptArgs.push(Chapter_Eng, "Chapter_Eng");
        if (section_trans) pythonScriptArgs.push(section_trans, "section_trans");
        if (section_eng) pythonScriptArgs.push(section_eng, "section_eng");
        console.log('Python script args:', pythonScriptArgs);

        // Execute the Python script using spawn
        const pythonScriptPath = path.join(__dirname, 'test.py');
        const pythonProcess = spawn('python', [pythonScriptPath, ...pythonScriptArgs]);
        console.log('Python script path:', pythonScriptPath);
        let output = '';
        let errorOutput = '';
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
                const result = JSON.parse(output.toString());

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
app.get('/api/all-details', async (req, res) => {
    try {
        const { selectedLanguage } = req.query;
        
        // Adjust the aggregation based on the selected language
        const groupByFields = selectedLanguage === 'English' 
            ? {
                chapterName: "$Chapter_Eng",  // Use Chapter_Eng for English
                sectionName: "$section_eng",    // Use section_eng for English
                verse: "$translation"            // Use translation for English
              }
            : {
                chapterName: "$chapterName",     // Use chapterName for Tamil
                sectionName: "$sectionName",     // Use sectionName for Tamil
                verse: "$verse"                   // Use verse for Tamil
              };

        const data = await Thirukkural.aggregate([
            {
                $group: {
                    _id: {
                        chapterName: groupByFields.chapterName,
                        sectionName: groupByFields.sectionName,
                        verse: groupByFields.verse
                    },
                    verseCount: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: {
                        chapterName: "$_id.chapterName",
                        sectionName: "$_id.sectionName"
                    },
                    verses: {
                        $push: {
                            verse: "$_id.verse",
                            count: "$verseCount"
                        }
                    }
                }
            },
            {
                $group: {
                    _id: "$_id.chapterName",
                    sections: {
                        $push: {
                            sectionName: "$_id.sectionName",
                            verses: "$verses"
                        }
                    }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        res.status(200).json(data);
    } catch (err) {
        console.error('Error fetching all details:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
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
