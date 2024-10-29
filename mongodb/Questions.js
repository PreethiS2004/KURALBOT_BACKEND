// models/Thirukkural.js
const mongoose = require('mongoose');

const questionsSchema = new mongoose.Schema({
    inputs:{ type: String, required: true },
    targets:{type: String, required: true},
    english_input:{type: String, required: true},
    number:{type: Number, required: true}
});
const qnsSchema = new mongoose.Schema({
    input:{ type: String, required: true },
    target:{type: String, required: true},
    number:{type: Number, required: true}
});

const Questions = mongoose.model('Questions', questionsSchema,'DETAIL2');
const Hindi_Qns=mongoose.model('Hindi_Qns',qnsSchema,'HINDI_QUESTIONS');
const Russian_qns=mongoose.model('Russian_Qns',qnsSchema,'RUSSIAN_QUESTIONS');

module.exports ={ Questions, Hindi_Qns, Russian_qns};