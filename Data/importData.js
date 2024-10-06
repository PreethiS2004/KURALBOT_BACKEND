// importData.js
const fs = require('fs');
const mongoose = require('mongoose');
const Thirukkural = require('../Thirukkural');


const importData = async () => {
    try {
        mongoose.connect('mongodb://127.0.0.1:27017/thirukkural', {

        }).then(() => {
            console.log('MongoDB connected successfully');
        }).catch((error) => {
            console.error('Error connecting to MongoDB:', error);
            process.exit(1); // Exit the process if the connection fails
        });
        // Read the JSON file
        const data = fs.readFileSync('preprocessed_file.json', 'utf8');

        // Parse the JSON data
        const results = JSON.parse(data);

        let number = 1;
        for (const item of results) {
            // console.log("🚀 ~ importData ~ item:", item);
            // console.log(typeof item['Chapter_Name']);

            const thirukkural = new Thirukkural({
                chapterName: item['Chapter_Name'],
                sectionName: item['Section Name'],
                verse: item['Verse'],
                translation: item['Translation'],
                explanation: item['Explanation'],
                number: number++ // Ensure this field is parsed as an integer
            });

            await thirukkural.save();
        }
        console.log('JSON data imported into MongoDB');
    } catch (error) {
        console.error('Error importing JSON data:', error);
    } finally {
        mongoose.connection.close();
    }
};

importData();
