const router = require("express").Router();
const Comment = require("../models/Comment");

// 1. YORUM EKLE (DEBUG VERSİYONU 🕵️‍♂️)
router.post("/", async (req, res) => {
    try {
        console.log("📥 GELEN YORUM PAKETİ:", req.body); // Frontend ne gönderiyor görelim

        const newComment = new Comment(req.body);
        const savedComment = await newComment.save();

        console.log("✅ Yorum Başarıyla Kaydedildi!");
        res.status(200).json(savedComment);
    } catch (err) {
        console.log("🔥 PATLADIK! İŞTE HATA SEBEBİ:", err.message); // Hatayı terminale bas
        res.status(500).json({ error: err.message });
    }
});

// 2. YORUMLARI GETİR (Filtreli)
router.get("/", async (req, res) => {
    try {
        const { type, id } = req.query;
        // Filtreye uyanları bul, tarihe göre tersten sırala (En yeni en üstte)
        const comments = await Comment.find({ contentType: type, relatedId: id }).sort({ date: -1 });
        res.status(200).json(comments);
    } catch (err) {
        res.status(500).json(err);
    }
});

// 3. YORUM SİL (Sadece Sahibi veya Admin)
router.delete("/:id", async (req, res) => {
    try {
        await Comment.findByIdAndDelete(req.params.id);
        res.status(200).json("Yorum silindi.");
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;