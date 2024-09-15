// models/Thirukkural.js
const mongoose = require('mongoose');

const thirukkuralSchema = new mongoose.Schema({
    chapterName: { type: String, required: true },
    sectionName: { type: String, required: true },
    verse: { type: String, required: true },
    translation: { type: String, required: true },
    explanation: { type: String, required: true },
    number: { type: Number, required: true } // New field for numbering
});

const Thirukkural = mongoose.model('Thirukkural', thirukkuralSchema);

module.exports = Thirukkural;
