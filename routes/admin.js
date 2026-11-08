const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const User = require("../models/User");
const Post = require("../models/Post");
const Book = require("../models/Book");

// ==========================================
// 🛡️ GÜVENLİK KALKANI
// Bu dosyadaki TÜM rotalar sadece giriş yapmış adminler içindir
// ==========================================
router.use(authMiddleware, adminMiddleware);

// ==========================================
// 👤 KULLANICI YÖNETİMİ
// ==========================================

// 1. TÜM KULLANICILARI LİSTELE
router.get("/users", async (req, res) => {
    try {
        const users = await User.find().select("-password").sort({ createdAt: -1 });
        res.json({ message: "Kullanıcılar listelendi", total: users.length, users });
    } catch (err) {
        res.status(500).json({ message: "Sunucu hatası", error: err.message });
    }
});

// 2. KULLANICIYI BANLA
router.post("/ban/:id", async (req, res) => {
    try {
        const { reason } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) return res.status(404).json({ message: "Kullanıcı bulunamadı." });

        if (user.role === "admin") {
            return res.status(403).json({ message: "Yöneticiler banlanamaz! 🛡️" });
        }

        user.isBanned = true;
        user.banReason = reason || "Belirtilmedi";
        user.bannedAt = new Date();
        await user.save();

        res.json({ message: "Kullanıcı banlandı! 🚫" });
    } catch (error) {
        res.status(500).json({ message: "Ban işlemi başarısız.", error: error.message });
    }
});

// 3. BAN KALDIR (UNBAN)
router.post("/unban/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "Kullanıcı bulunamadı." });

        user.isBanned = false;
        user.banReason = null;
        user.bannedAt = null;
        await user.save();

        res.json({ message: "Kullanıcının banı kaldırıldı 😇", userId: user._id });
    } catch (error) {
        res.status(500).json({ message: "Sunucu hatası", error: error.message });
    }
});

// 4. ROZET EKLE
router.post("/badge/:id", async (req, res) => {
    try {
        const { badge } = req.body;
        if (!badge) return res.status(400).json({ message: "Rozet adı belirtilmedi." });

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "Kullanıcı bulunamadı." });

        if (user.badges && user.badges.includes(badge)) {
            return res.status(400).json({ message: "Bu rozet kullanıcıda zaten mevcut." });
        }

        user.badges.push(badge);
        await user.save();
        res.json({ message: "Rozet eklendi 🎖️", badges: user.badges });
    } catch (error) {
        res.status(500).json({ message: "Sunucu hatası", error: error.message });
    }
});

// 5. ROZET SİL
router.post("/remove-badge/:id", async (req, res) => {
    try {
        const { badge } = req.body;
        if (!badge) return res.status(400).json({ message: "Rozet adı belirtilmedi." });

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "Kullanıcı bulunamadı." });

        user.badges = (user.badges || []).filter(b => b !== badge);
        await user.save();

        res.json({ message: `${badge} rozeti kaldırıldı! 🗑️`, badges: user.badges });
    } catch (error) {
        res.status(500).json({ message: "Rozet silinemedi.", error: error.message });
    }
});

// ==========================================
// 📝 İÇERİK EKLEME
// ==========================================

// 6. YAZI EKLE
router.post("/add-post", async (req, res) => {
    try {
        const newPost = new Post({ ...req.body, author: req.user.username });
        await newPost.save();
        res.status(201).json({ message: "Yazı başarıyla eklendi! 📝", post: newPost });
    } catch (err) {
        res.status(500).json({ message: "Yazı eklenirken hata oluştu", error: err.message });
    }
});

// 7. KİTAP EKLE
router.post("/add-book", async (req, res) => {
    try {
        const newBook = new Book(req.body);
        await newBook.save();
        res.status(201).json({ message: "Kitap başarıyla eklendi! 📚", book: newBook });
    } catch (err) {
        res.status(500).json({ message: "Kitap eklenirken hata oluştu", error: err.message });
    }
});

module.exports = router;