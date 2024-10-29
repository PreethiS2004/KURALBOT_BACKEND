// models/Thirukkural.js
const mongoose = require('mongoose');


const hindischema=new mongoose.Schema({
    chapter: { type: String, required: true },
    chapter_group:{ type: String, required: true },
    section: { type: String, required: true },
    translation: { type: String, required: true },
    number: { type: Number, required: true } 

})