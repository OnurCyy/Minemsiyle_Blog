const mongoose = require('mongoose');

const SavedItemSchema = new mongoose.Schema({
    username: { type: String, required: true }, // Kim kaydetti?
    type: { type: String, enum: ['book', 'blog'], required: true }, // Kitap mı Blog mu?
    itemId: { type: String, required: true },   // Neyin ID'si?
    title: { type: String, required: true },    // Başlığı ne? (Listelerken kolaylık olsun)
    image: { type: String },                    // Kapak resmi
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.models.SavedItem || mongoose.model('SavedItem', SavedItemSchema);