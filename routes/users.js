const router = require("express").Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs"); // Şifreleme için lazım
const authMiddleware = require("../middleware/authMiddleware");

// ======================================================
// 1. MEVCUT KODLARIN (Profil İşlemleri)
// ======================================================

// A. PROFİL BİLGİLERİMİ GETİR
router.get("/me", authMiddleware, async (req, res) => {
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
        const { username, bio, profileImage, oldPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) return res.status(404).json({ message: "Kullanıcı yok" });

        if (username) user.username = username;
        if (bio) user.bio = bio;
        if (profileImage) user.profileImage = profileImage;

        if (newPassword && oldPassword) {
            const isMatch = await bcrypt.compare(oldPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: "Eski şifren hatalı! ❌" });
            }
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
        }

        await user.save();
        res.json({ message: "Profil başarıyla güncellendi! ✅", user });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: "Bu kullanıcı adı zaten dolu!" });
        }
        res.status(500).json({ message: "Güncelleme hatası." });
    }
});

// ======================================================
// 2. YENİ EKLENENLER (Admin Paneli İçin Lazım Olanlar)
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

// D. KULLANICIYI BANLA / BANINI AÇ (TOGGLE) 🚫
router.put("/:id/ban", async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) return res.status(404).json("Kullanıcı bulunamadı");

        // Eğer zaten banlıysa -> Banı kaldır (Affet)
        if (user.isBanned) {
            user.isBanned = false;
            user.banReason = ""; // Sicili temizle
            await user.save();
            return res.status(200).json({ message: "Kullanıcı banı kaldırıldı.", user });
        }

        // Eğer banlı değilse -> Banla
        else {
            const { reason } = req.body; // Frontend'den gelen sebep
            user.isBanned = true;
            user.banReason = reason || "Sebep belirtilmedi.";
            await user.save();
            return res.status(200).json({ message: "Kullanıcı banlandı.", user });
        }

    } catch (err) {
        res.status(500).json(err);
    }
});

// E. ROZET VER 🎖️
router.put("/:id/badges", async (req, res) => {
    try {
        const { badges } = req.body; // Örn: ["vip", "writer"]
        const user = await User.findByIdAndUpdate(req.params.id, { badges }, { new: true });
        res.status(200).json({ message: "Rozetler güncellendi", user });
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;