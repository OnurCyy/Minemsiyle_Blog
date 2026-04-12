const router = require("express").Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const Comment = require("../models/Comment");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware/authMiddleware");

// ======================================================
// 1. HERKESE AÇIK KULLANICI İŞLEMLERİ (PROFİL GÖRÜNTÜLEME)
// ======================================================

//  İSME GÖRE PROFİL GETİR
router.get("/:username", async (req, res) => {
    try {
        // İsme göre bul ama şifresini gizle
        const user = await User.findOne({ username: req.params.username }).select("-password");

        if (!user) {
            return res.status(404).json({ message: "Kullanıcı bulunamadı" });
        }
        res.status(200).json(user);
    } catch (err) {
        res.status(500).json({ message: "Sunucu hatası" });
    }
});

// ======================================================
// 2. OTURUM AÇMIŞ KULLANICI İŞLEMLERİ
// ======================================================

// A. KENDİ PROFİLİMİ GETİR
router.get("/profile/me", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) return res.status(404).json({ message: "Kullanıcı yok" });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Sunucu hatası" });
    }
});

// B. PROFİL GÜNCELLE
router.put("/update", authMiddleware, async (req, res) => {
    try {
        const { username, bio, avatar, profileImage, oldPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) return res.status(404).json({ message: "Kullanıcı yok" });

        if (username) user.username = username;
        if (bio) user.bio = bio;

        if (avatar) user.avatar = avatar;
        if (profileImage) user.avatar = profileImage;

        // Şifre Değiştirme
        if (newPassword && oldPassword) {
            const isMatch = await bcrypt.compare(oldPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: "Eski şifren hatalı! ❌" });
            }
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
        }

        await user.save();
        res.json({ message: "Profil güncellendi! ✅", user });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: "Bu kullanıcı adı zaten dolu!" });
        }
        res.status(500).json({ message: "Güncelleme hatası." });
    }
});

//  KAYDET / KAYDI KALDIR (TOGGLE)
router.post('/save', authMiddleware, async (req, res) => {
    try {
        // authMiddleware sayesinde req.user.id elimizde hazır
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "Okur bulunamadı." });

        // Frontend'den Gelen Kitap/Blog Verileri
        const { itemId, title, type, url } = req.body;

        // Bu yazı daha önce kaydedilmiş mi diye kontrol et
        const existingIndex = user.savedItems.findIndex(item => item.itemId === itemId);

        if (existingIndex !== -1) {
            // VARSA LİSTEDEN SİL (Unsave)
            user.savedItems.splice(existingIndex, 1);
            await user.save();
            return res.status(200).json({ message: "Kütüphaneden çıkarıldı.", status: "removed" });
        } else {
            // YOKSA LİSTEYE EKLE (Save)
            user.savedItems.push({ itemId, title, type, url });
            await user.save();
            return res.status(200).json({ message: "Kütüphaneye eklendi!", status: "added" });
        }

    } catch (error) {
        console.error("Kaydetme Hatası:", error);
        res.status(500).json({ message: "Arka planda bir çark kırıldı." });
    }
});

//  KAYITLI LİSTEYİ GETİR (Profil Sayfası İçin)
router.get('/profile/saved', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "Okur bulunamadı." });

        // Sadece savedItems array'ini yolla
        res.json({ savedItems: user.savedItems || [] });

    } catch (error) {
        console.error("Kayıtları Çekme Hatası:", error);
        res.status(500).json({ message: "Kayıtlı yazılar alınamadı." });
    }
});

//  KULLANICININ YORUMLARINI GETİR (Profil Sayfası İçin)
router.get('/profile/comments', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "Okur bulunamadı." });

        // Veritabanındaki tüm yorumlar içinde 'username'i bu kullanıcı olanları bul
        // ve en yeniler en üstte olacak şekilde sırala (-1)
        const userComments = await Comment.find({ username: user.username }).sort({ createdAt: -1 });

        res.json({ comments: userComments });

    } catch (error) {
        console.error("Yorumları Çekme Hatası:", error);
        res.status(500).json({ message: "Yorumlar alınamadı." });
    }
});

// ======================================================
// 3. ADMİN İŞLEMLERİ
// ======================================================

// C. TÜM KULLANICILARI LİSTELE
router.get("/", async (req, res) => {
    try {
        const users = await User.find().select("-password").sort({ createdAt: -1 });
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json(err);
    }
});

// D. BANLAMA SİSTEMİ
router.put("/:id/ban", async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json("Kullanıcı bulunamadı");

        if (user.isBanned) {
            user.isBanned = false;
            user.banReason = "";
            await user.save();
            return res.status(200).json({ message: "Ban kaldırıldı.", user });
        } else {
            const { reason } = req.body;
            user.isBanned = true;
            user.banReason = reason || "Sebep belirtilmedi.";
            await user.save();
            return res.status(200).json({ message: "Kullanıcı banlandı.", user });
        }
    } catch (err) {
        res.status(500).json(err);
    }
});

// E. ROZET SİSTEMİ
router.put("/:id/badges", async (req, res) => {
    try {
        const { badges, tags } = req.body;
        const newBadges = badges || tags;

        const user = await User.findByIdAndUpdate(req.params.id, { badges: newBadges, tags: newBadges }, { new: true });
        res.status(200).json({ message: "Rozetler güncellendi", user });
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;