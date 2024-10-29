const express = require('express');
const mongoose = require('mongoose');
const { Questions,Hindi_Qns,Russian_qns} = require('./mongodb/Questions'); // Adjust the path as needed

const { Thirukkural, Hindikural, Russiankural } = require('./mongodb/Thirukkural');

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
// Endpoint to get questions based on inputs
app.get('/api/questions', async (req, res) => {
    const { inputs, english_input,input, selectedLanguage } = req.query;

    // Validate the input
    if (!inputs && !english_input && !input) {
        return res.status(400).json({ message: 'No valid inputs provided' });
    }

    let QuestionsModel;
    if (selectedLanguage.toLowerCase() === 'Russian') {
        QuestionsModel = Russian_qns;  // Use Russian questions model
    } else if (selectedLanguage.toLowerCase() === 'Hindi') {
        QuestionsModel = Hindi_Qns;  // Use Hindi questions model
    } else {
        QuestionsModel = Questions;  // Default to Tamil/English questions model
    }

    let pythonScriptArgs = [];
    
    if (inputs) pythonScriptArgs.push(inputs, "inputs");
    if (input) pythonScriptArgs.push(input, "input");

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
            const numbers = result.numbers;

            if (!numbers || numbers.length === 0) {
                return res.status(404).json({ message: 'No questions found for the given inputs' });
            }

            // Fetch questions based on the numbers returned
            const questions = await QuestionsModel.find({ number: { $in: numbers } });

            if (questions.length === 0) {
                return res.status(404).json({ message: 'No questions found for the given numbers' });
            }

            res.status(200).json(questions);
        } catch (parseError) {
            console.error('Error parsing Python script output:', parseError);
            res.status(500).json({ message: 'Error parsing Python script output', error: parseError.message });
        }
    });
});

// Endpoint to get Kural details based on input
app.get('/api/kurals', async (req, res) => {
    const { selectedLanguage, chapterName, sectionName, verse, translation, explanation, Chapter, Chapter_Eng, section_eng, section_trans,chapter,chapter_group,Section,Chapter_group} = req.query;
    console.log(`[DEBUG] Received request: Language = ${selectedLanguage}`);
    if (!chapterName && !sectionName && !verse && !translation && !explanation && !Chapter_Eng && !section_eng && !section_trans && !Chapter && !chapter && !Chapter_group && !Section && !chapter_group) {
        return res.status(400).json({ message: 'No valid query parameters provided' });
    }

if (selectedLanguage === 'english') {
    KuralModel = Thirukkural;
    console.log(`[DEBUG] KuralModel set to1: ${KuralModel.modelName}`);
} else if (selectedLanguage === 'hindi') {
    KuralModel = Hindikural;
    console.log(`[DEBUG] KuralModel set to2: ${KuralModel.modelName}`);
} else if (selectedLanguage === 'russian') {
    KuralModel = Russiankural;  // This line is for the fallback or the Russian condition
    console.log(`[DEBUG] KuralModel set to3: ${KuralModel.modelName}`);
} else {
    KuralModel = Thirukkural;  // Default case
    console.log(`[DEBUG] KuralModel set to4: ${KuralModel.modelName}`);
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
    if (chapter) pythonScriptArgs.push(chapter, "chapter");
    if (Section) pythonScriptArgs.push(Section, "Section");
    if (Chapter_group) pythonScriptArgs.push(Chapter_group, "Chapter_group");
    if (chapter_group) pythonScriptArgs.push(chapter_group, "chapter_group");
    if (Chapter_Eng) pythonScriptArgs.push(Chapter_Eng, "Chapter_Eng");
    if (section_trans) pythonScriptArgs.push(section_trans, "section_trans");
    if (section_eng) pythonScriptArgs.push(section_eng, "section_eng");
    console.log('Python script args:', pythonScriptArgs);

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

        try {
            const result = JSON.parse(output.toString());

            if (result.error) {
                return res.status(500).json({ message: 'Error from Python script', error: result.error });
            }

            const numbers = result.numbers;
            if (!numbers || numbers.length === 0) {
                return res.status(404).json({ message: 'No Kural details found for the given parameters' });
            }

            // Fetch Kural details from the selected Kural model
            const kurals = await KuralModel.find({ number: { $in: numbers } });

            if (kurals.length === 0) {
                return res.status(404).json({ message: 'No Kural details found for the given numbers' });
            }

            res.status(200).json(kurals);
        } catch (parseError) {
            console.error('Error parsing Python script output:', parseError);
            res.status(500).json({ message: 'Error parsing Python script output', error: parseError.message });
        }
    });
});

app.get('/api/all-details', async (req, res) => {
    try {
        const { selectedLanguage } = req.query;
        console.log(`[DEBUG] Received request: Language = ${selectedLanguage}`);

        let model; 
        const groupByFields = (() => {
            switch (selectedLanguage) {
                case 'English':
                    model = Thirukkural;  // English data in 'Thirukkural' model
                    return {
                        chapterName: "$Chapter_Eng",  // Use Chapter_Eng for English
                        sectionName: "$section_eng",  // Use section_eng for English
                        verse: "$translation"         // Use translation for English
                    };
                case 'Tamil':
                    model = Thirukkural;  // Tamil data in 'Thirukkural' model
                    return {
                        chapterName: "$chapterName",   // Use chapterName for Tamil
                        sectionName: "$sectionName",   // Use sectionName for Tamil
                        verse: "$verse"                // Use verse for Tamil
                    };
                case 'Hindi':
                    model = Hindikural;  // Hindi data in 'Hindikural' model
                    return {
                        chapterName: "$chapter",       // Use chapter for Hindi
                        sectionName: "$section",       // Use section for Hindi
                        verse: "$translation"          // Use translation for Hindi
                    };
                case 'Russian':
                    model = Russiankural;  // Russian data in 'Russiankural' model
                    return {
                        chapterName: "$Chapter",       // Use Chapter for Russian
                        sectionName: "$Section",       // Use Section for Russian
                        verse: "$translation"          // Use translation for Russian
                    };
                default:
                    return res.status(400).json({ message: 'Invalid language selection' });
            }
        })();
        console.log(`[DEBUG] KuralModel set to4: ${model.modelName}`);

        // Run the aggregation query
        const data = await model.aggregate([
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
        console.log('Aggregated Data:', JSON.stringify(data, null, 2));
        // Send the aggregated data as a response
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
