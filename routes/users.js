const router = require("express").Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const authMiddleware = require("../middleware/authMiddleware");

// ======================================================
// 1. HERKESE AÇIK KULLANICI İŞLEMLERİ (PROFİL GÖRÜNTÜLEME)
// ======================================================

// 🔥 YENİ EKLENEN: İSME GÖRE PROFİL GETİR (Bu eksikti!)
// Örn: /api/users/OnurCy dediğinde burası çalışacak
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

// B. PROFİL GÜNCELLE (Avatar Düzeltmesi Yapıldı)
router.put("/update", authMiddleware, async (req, res) => {
    try {
        // Frontend 'avatar' gönderiyor, burada 'profileImage' kalmış. DÜZELTTİM:
        const { username, bio, avatar, profileImage, oldPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) return res.status(404).json({ message: "Kullanıcı yok" });

        if (username) user.username = username;
        if (bio) user.bio = bio;

        // Hem yeni 'avatar' ismini hem eski 'profileImage' ismini destekle (Garanti olsun)
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
        // Admin panelinden gelen 'tags' veya 'badges' verisini al
        const { badges, tags } = req.body;
        // Hangisi doluysa onu kullan
        const newBadges = badges || tags;

        const user = await User.findByIdAndUpdate(req.params.id, { badges: newBadges, tags: newBadges }, { new: true });
        res.status(200).json({ message: "Rozetler güncellendi", user });
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;