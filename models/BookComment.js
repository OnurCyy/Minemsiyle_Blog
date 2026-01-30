const mongoose = require('mongoose');

const BlogCommentSchema = new mongoose.Schema({
    bookId: { type: String, required: true }, // Hangi kitap yazısı?
    text: { type: String, required: true },   // Yorum ne?
    author: { type: String, required: true }, // Kim yazdı?
    avatar: { type: String, default: "https://i.pravatar.cc/150?img=12" }, // Resmi
    role: { type: String, default: "Okur" },  // Rütbesi
    date: { type: Date, default: Date.now }   // Ne zaman?
});

module.exports = mongoose.model('BlogComment', BlogCommentSchema);