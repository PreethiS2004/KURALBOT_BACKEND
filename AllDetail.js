const mongoose = require('mongoose');
const Thirukkural = require('./Thirukkural'); // Adjust the path to your model

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/CHATBOT')
    .then(() => {
        console.log('MongoDB connected successfully');
        return fetchChapterSectionsAndVerses();
    })
    .catch((error) => {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    });

// Function to fetch chapter names, section counts, and verse details
const fetchChapterSectionsAndVerses = async () => {
    try {
        const data = await Thirukkural.aggregate([
            {
                $group: {
                    _id: {
                        chapterName: "$chapterName", // Group by chapterName
                        sectionName: "$sectionName", // Also group by sectionName
                        verse: "$verse"               // Group by verse
                    },
                    verseCount: { $sum: 1 }           // Count occurrences of each verse (if applicable)
                }
            },
            {
                $group: {
                    _id: {
                        chapterName: "$_id.chapterName", // Group again by chapterName and sectionName
                        sectionName: "$_id.sectionName"
                    },
                    verses: {
                        $push: {
                            verse: "$_id.verse",        // Push verse details under each section
                            count: "$verseCount"        // Count of verses (if needed)
                        }
                    }
                }
            },
            {
                $group: {
                    _id: "$_id.chapterName", // Group by chapterName to gather sections and verses
                    sections: {
                        $push: {
                            sectionName: "$_id.sectionName", // Push section names
                            verses: "$verses"                 // Push verse details
                        }
                    }
                }
            },
            {
                $sort: { _id: 1 } // Sort chapters alphabetically by name (optional)
            }
        ]);

        console.log("Chapter, Section, and Verse Details:");
        data.forEach(item => {
            console.log(`${item._id}:`);
            item.sections.forEach(section => {
                console.log(`  ${section.sectionName}:`);
                section.verses.forEach((verse, index) => {
                    console.log(`    ${index + 1}. ${verse.verse}`); // Display verse details with numbering
                });
            });
        });

        mongoose.connection.close(); // Close the connection after fetching
    } catch (err) {
        console.error('Error fetching chapter, section, and verse details:', err);
    }
};
