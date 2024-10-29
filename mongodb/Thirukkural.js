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

const hindischema=new mongoose.Schema({
    chapter: { type: String, required: true },
    chapter_group:{ type: String, required: true },
    section: { type: String, required: true },
    translation: { type: String, required: true },
    number: { type: Number, required: true } 

})
const russianschema=new mongoose.Schema({
    Chapter: { type: String, required: true },
    Chapter_group:{ type: String, required: true },
    Section: { type: String, required: true },
    translation: { type: String, required: true },
    number: { type: Number, required: true } 

})
const Thirukkural = mongoose.model('Thirukkural', thirukkuralSchema,'DETAIL1');
const Hindikural = mongoose.model('Hindikural',hindischema,'HINDI_DETAIL');
const Russiankural = mongoose.model('Russiankural',russianschema,'RUSSIAN_DETAIL');

module.exports = Thirukkural;
module.exports = Hindikural;
module.exports = Russiankural; 

