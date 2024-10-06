// models/Thirukkural.js
const mongoose = require('mongoose');

const thirukkuralSchema = new mongoose.Schema({
    chapterName: { type: String, required: true },
    sectionName: { type: String, required: true },
    verse: { type: String, required: true },
    translation: { type: String, required: true },
    explanation: { type: String, required: true },
    number: { type: Number, required: true } ,
    Chapter:{ type: String, required: true } ,
    Chapter_Eng:{ type: String, required: true },
    chapter_group_eng:{ type: String, required: true },
    chapter_group_tam:{ type: String, required: true },
    chapter_group_trans:{ type: String, required: true },
    section_eng:{ type: String, required: true },
    section_trans:{ type: String, required: true }
});


const Thirukkural = mongoose.model('Thirukkural', thirukkuralSchema,'DETAIL1');

module.exports = Thirukkural;

