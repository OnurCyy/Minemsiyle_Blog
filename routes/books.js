const express = require("express");
const router = express.Router();
const Book = require("../models/Book"); // Kitap modelini çağır

// HERKESİN GÖRECEĞİ KİTAP LİSTESİ (GET İSTEĞİ)
router.get("/", async (req, res) => {
    try {
        // En yeniden en eskiye doğru sırala (-1)
        const books = await Book.find().sort({ createdAt: -1 });
        res.json(books);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;