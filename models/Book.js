const mongoose = require('mongoose');

const BookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    author: {
        type: String,
        required: true
    },
    tag: {
        type: String,
        default: 'Roman' // Roman, Tarih, Kurgu vs.
    },
    cover: {
        type: String, // Kitap kapağı resmi için (İlerde lazım olur)
        default: "assets/images/cover1.jpg"
    },
    desc: {
        type: String,
        default: ""
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    publisher: {
        type: String,
        default: "Bilinmiyor"
    },
    year: {
        type: Number,
        default: 2026
    },
    likes: {
        type: Number,
        default: 0
    },
    pageCount: {
        type: Number,
        default: 0
    },
}, { timestamps: true, collection: 'books' });

module.exports = mongoose.model('Book', BookSchema);