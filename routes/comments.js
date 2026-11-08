const express = require("express");
const router = express.Router();
const Comment = require("../models/Comment");
const authMiddleware = require("../middleware/authMiddleware");

// ==========================================
// 1. YORUM EKLE
// ==========================================
router.post("/", async (req, res) => {
    try {
        const { username, text, contentType, relatedId } = req.body;

        if (!username || !text || !contentType || !relatedId) {
            return res.status(400).json({ message: "Zorunlu alanlar eksik gönderildi." });
        }

        const newComment = new Comment({
            username: username.trim(),
            text: text.trim(),
            contentType,
            relatedId,
            date: new Date()
        });

        const savedComment = await newComment.save();
        res.status(201).json(savedComment);
    } catch (err) {
        res.status(500).json({ message: "Yorum kaydedilemedi.", error: err.message });
    }
});

// ==========================================
// 2. YORUMLARI GETİR (Filtreli)
// ==========================================
router.get("/", async (req, res) => {
    try {
        const { type, id } = req.query;

        if (!type || !id) {
            return res.status(400).json({ message: "İçerik türü ve ID belirtilmelidir." });
        }

        const comments = await Comment.find({ contentType: type, relatedId: id }).sort({ date: -1 });
        res.status(200).json(comments);
    } catch (err) {
        res.status(500).json({ message: "Yorumlar getirilemedi.", error: err.message });
    }
});

// ==========================================
// 3. YORUM SİL (Sadece Sahibi veya Admin)
// ==========================================
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);

        if (!comment) {
            return res.status(404).json({ message: "Silinecek yorum bulunamadı." });
        }

        const isOwner = req.user?.username === comment.username;
        const isAdmin = req.user?.role === "admin";

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: "Bu yorumu silme yetkiniz bulunmuyor." });
        }

        await Comment.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Yorum başarıyla silindi." });
    } catch (err) {
        res.status(500).json({ message: "Yorum silinirken hata oluştu.", error: err.message });
    }
});

module.exports = router;