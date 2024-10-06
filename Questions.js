// models/Thirukkural.js
const mongoose = require('mongoose');

const questionsSchema = new mongoose.Schema({
    inputs:{ type: String, required: true },
    targets:{type: String, required: true},
    english_input:{type: String, required: true},
    number:{type: Number, required: true}
});


const Questions = mongoose.model('Questions', questionsSchema,'DETAIL2');

module.exports = Questions;