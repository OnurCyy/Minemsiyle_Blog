const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const User = require("../models/User");
const Post = require("../models/Post");
const Book = require("../models/Book");
const Message = require('../models/Message');

// ==========================================
// 👤 KULLANICI YÖNETİMİ (Ban, Rozet vs.)
// ==========================================

// 1. TÜM KULLANICILARI LİSTELE
router.get("/users", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const users = await User.find().select("-password").sort({ createdAt: -1 });
        res.json({ message: "Kullanıcılar listelendi", total: users.length, users });
    } catch (err) {
        res.status(500).json({ message: "Sunucu hatası" });
    }
});

// 2. KULLANICIYI BANLA
router.post("/ban/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { reason } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) return res.status(404).json({ message: "Kullanıcı yok!" });

        if (user.role === 'admin') {
            return res.status(403).json({ message: "Yöneticiler banlanamaz! 🛡️" });
        }

        user.isBanned = true;
        user.banReason = reason || "Belirtilmedi";
        user.bannedAt = new Date();
        await user.save();

        res.json({ message: "Kullanıcı banlandı! 🚫" });
    } catch (error) {
        res.status(500).json({ message: "Ban işlemi başarısız." });
    }
});

// 3. BAN KALDIR (UNBAN)
router.post("/unban/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "Kullanıcı bulunamadı" });

        user.isBanned = false;
        user.banReason = null;
        user.bannedAt = null;
        await user.save();

        res.json({ message: "Kullanıcının banı kaldırıldı 😇", userId: user._id });
    } catch (error) {
        res.status(500).json({ message: "Sunucu hatası" });
    }
});

// 4. ROZET EKLE
router.post("/badge/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { badge } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "Kullanıcı yok" });

        if (user.badges.includes(badge)) return res.status(400).json({ message: "Bu rozet zaten var" });

        user.badges.push(badge);
        await user.save();
        res.json({ message: "Rozet eklendi 🎖️", badges: user.badges });
    } catch (error) {
        res.status(500).json({ message: "Sunucu hatası" });
    }
});

// 5. ROZET SİL
router.post("/remove-badge/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { badge } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "Kullanıcı yok!" });

        user.badges = user.badges.filter(b => b !== badge);
        await user.save();

        res.json({ message: `${badge} rozeti söküldü! 🗑️`, badges: user.badges });
    } catch (error) {
        res.status(500).json({ message: "Rozet silinemedi." });
    }
});

// 6. Tüm mesaj loglarını görme (Admin paneli için)
router.get('/chat-logs', async (req, res) => {
    try {
        const logs = await Message.find().sort({ date: -1 }).limit(100);
        res.json(logs);
    } catch (err) { res.status(500).json({ error: "Loglar çekilemedi" }); }
});

// 7. Mesaj silme (Küfür vs. durumunda admin silsin)
router.delete('/delete-message/:id', async (req, res) => {
    try {
        await Message.findByIdAndDelete(req.params.id);
        res.json({ message: "Mesaj imha edildi! 💣" });
    } catch (err) { res.status(500).json({ error: "Silme işlemi başarısız" }); }
});

// ==========================================
// 📝 İÇERİK EKLEME (Yedek Rotalar)
// ==========================================

// YAZI EKLE
router.post("/add-post", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const newPost = new Post({ ...req.body, author: req.user.username });
        await newPost.save();
        res.json({ message: "Yazı başarıyla eklendi! 📝", post: newPost });
    } catch (err) {
        res.status(500).json({ message: "Hata oluştu" });
    }
});

// KİTAP EKLE
router.post("/add-book", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const newBook = new Book(req.body);
        await newBook.save();
        res.json({ message: "Kitap başarıyla eklendi! 📚", book: newBook });
    } catch (err) {
        res.status(500).json({ message: "Hata oluştu" });
    }
});

module.exports = router;