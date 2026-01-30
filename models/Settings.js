const mongoose = require("mongoose");

const SettingsSchema = new mongoose.Schema({
    // 1. GÜNÜN SÖZÜ
    quotes: [
        {
            text: { type: String, required: true },
            author: { type: String, default: "Anonim" }
        }
    ],

    // 2. ŞU AN MASAMDA (Okunan Kitap)
    currentBook: {
        title: { type: String, default: "Henüz seçilmedi" },
        author: { type: String, default: "-" },
        totalPage: { type: Number, default: 100 },
        cover: { type: String, default: "https://placehold.co/150?text=Kapak+Yok" },
        currentPage: { type: Number, default: 0 },
        percent: { type: Number, default: 0 }
    },

    // 3. YILLIK HEDEF
    goal: {
        target: { type: Number, default: 50 }, // Hedef
        current: { type: Number, default: 0 }  // Biten
    },

    maintenance: { type: Boolean, default: false }

}, { timestamps: true });

module.exports = mongoose.model("GeneralSettings", SettingsSchema);