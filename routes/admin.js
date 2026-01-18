const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const User = require("../models/User");
const SiteSettings = require("../models/SiteSettings");

// EKSİK OLAN PARÇALAR: Modelleri buraya çağırmalıyız
// Eğer models klasöründe Post.js ve Book.js yoksa hata verir, onları da oluşturacağız.
const Post = require("../models/Post");
const Book = require("../models/Book");

// --- MEVCUT KODLARIN (DOKUNMADIM) ---

// TÜM KULLANICILARI LİSTELE
router.get("/users", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const users = await User.find().select("-password");
        res.json({ message: "Kullanıcılar listelendi", total: users.length, users });
    } catch (err) {
        res.status(500).json({ message: "Sunucu hatası" });
    }
});

// UNBAN
router.post("/unban/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "Kullanıcı bulunamadı" });
        if (!user.isBanned) return res.status(400).json({ message: "Kullanıcı zaten banlı değil" });

        user.isBanned = false;
        user.banReason = null;
        user.bannedAt = null;
        await user.save();

        res.json({ message: "Kullanıcının banı kaldırıldı", userId: user._id });
    } catch (error) {
        res.status(500).json({ message: "Sunucu hatası" });
    }
});

// ROZET İŞLEMLERİ
router.post("/badge/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { badge } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "Kullanıcı yok" });

        if (user.badges.includes(badge)) return res.status(400).json({ message: "Bu rozet zaten var" });
        user.badges.push(badge);
        await user.save();
        res.json({ message: "Rozet eklendi", badges: user.badges });
    } catch (error) {
        res.status(500).json({ message: "Sunucu hatası" });
    }
});

router.post("/badge-remove/:id", authMiddleware, adminMiddleware, async (req, res) => {
    const { badge } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Kullanıcı yok" });
    user.badges = user.badges.filter(b => b !== badge);
    await user.save();
    res.json({ message: "Rozet kaldırıldı", badges: user.badges });
});

// BAKIM MODU
router.post("/maintenance", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { enabled } = req.body;
        let settings = await SiteSettings.findOne();
        if (!settings) { settings = new SiteSettings({ maintenance: enabled }); }
        else { settings.maintenance = enabled; }
        await settings.save();
        res.json({ message: `Bakım modu ${enabled ? "AÇILDI" : "KAPATILDI"}`, maintenance: enabled });
    } catch (err) {
        res.status(500).json({ message: "Sunucu hatası" });
    }
});

// --- İŞTE YENİ EKLENEN KISIMLAR (KAYIP HALKALAR) ---

// 1. YAZI EKLEME (POST)
router.post("/add-post", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        // Frontend'den gelen verileri al
        const { title, category, excerpt, content, cover } = req.body;

        // Yeni yazı oluştur
        const newPost = new Post({
            title,
            category,
            excerpt,
            content,
            cover, // Resim URL'si varsa
            author: req.user.username // Token'dan gelen admin ismi
        });

        await newPost.save();

        res.json({ message: "Yazı başarıyla eklendi! 📝", post: newPost });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Yazı eklenirken hata oluştu" });
    }
});

// 2. KİTAP EKLEME (GÜNCELLENMİŞ VERSİYON)
router.post("/add-book", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        // ARTIK cover (Kapak) ve desc (Açıklama) DE ALIYORUZ
        const { title, author, tag, rating, cover, desc } = req.body;

        const newBook = new Book({
            title,
            author,
            tag,
            rating: rating || 5,
            // Eğer resim gelmezse varsayılan bir kapak koyalım
            cover: cover || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80",
            desc: desc || "Bu kitap için henüz açıklama girilmedi."
        });

        await newBook.save();

        res.json({ message: "Kitap başarıyla eklendi! 📚", book: newBook });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Kitap eklenirken hata oluştu" });
    }
});

module.exports = router;