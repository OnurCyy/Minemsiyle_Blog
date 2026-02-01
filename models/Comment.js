const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema({
    // Yorumu Yapanın Bilgileri
    userId: { type: String, required: true },
    username: { type: String, required: true },
    avatar: { type: String },

    // Yorum İçeriği
    content: { type: String, required: true },

    // 🔥 İŞTE SİHİRLİ KISIM BURASI 🔥
    contentType: {
        type: String,
        required: true,
        enum: ['book', 'blog'] // Sadece 'book' veya 'blog' olabilir
    },
    relatedId: {
        type: String,
        required: true
    }, // Hangi blog yazısı veya hangi kitap olduğu (ID'si veya Başlığı)

    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Comment", CommentSchema);