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
    rating: {
        type: Number,
        default: 5, // Varsayılan 5 yıldız
        min: 1,
        max: 5
    },
    cover: {
        type: String, // Kitap kapağı resmi için (İlerde lazım olur)
        default: "assets/images/cover1.jpg"
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Book', BookSchema);