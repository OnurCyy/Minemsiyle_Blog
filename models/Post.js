const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    // 👇 İşte burası eksik olduğu için yazılar kayboluyor!
    content: {
        type: String,
        required: true
    },
    category: {
        type: String,
        default: 'Genel'
    },
    // 👇 Kısa açıklama alanı (Burası yoksa özet kaydolmaz)
    excerpt: {
        type: String,
        default: ''
    },
    // 👇 Resim alanları
    image: {
        type: String,
        default: ''
    },
    cover: {
        type: String,
        default: ''
    },
    tags: {
        type: [String],
        default: []
    },
    author: {
        type: String,
        default: 'Anonim'
    },
    date: {
        type: Date,
        default: Date.now
    },
    likes: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Post', PostSchema);