const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Comment = require("../models/Comment");
const SavedItem = require("../models/SavedItem");

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

// ======================================================
// 1. OTURUM AÇMIŞ KULLANICI PROFİL İŞLEMLERİ (/profile/*)
// (ÖNEMLİ: /:username rotasından ÖNCE tanımlanmalıdır)
// ======================================================

// A. KENDİ PROFİLİMİ GETİR
router.get("/profile/me", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) return res.status(404).json({ message: "Kullanıcı bulunamadı." });
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: "Sunucu hatası", error: error.message });
    }
});

// B. KAYITLI İÇERİKLERİ GETİR
router.get("/profile/saved", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "Kullanıcı bulunamadı." });

        // Hem SavedItem koleksiyonundan hem kullanıcı belgesinden en güncel listeyi al
        const items = await SavedItem.find({ username: user.username }).sort({ createdAt: -1 });
        res.status(200).json({ savedItems: items.length > 0 ? items : (user.savedItems || []) });
    } catch (error) {
        res.status(500).json({ message: "Kayıtlı içerikler alınamadı.", error: error.message });
    }
});

// C. KULLANICININ KENDİ YORUMLARINI GETİR
router.get("/profile/comments", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "Kullanıcı bulunamadı." });

        const userComments = await Comment.find({ username: user.username }).sort({ createdAt: -1 });
        res.status(200).json({ comments: userComments });
    } catch (error) {
        res.status(500).json({ message: "Yorumlar alınamadı.", error: error.message });
    }
});

// D. PROFİL BİLGİLERİNİ GÜNCELLE
router.put("/update", authMiddleware, async (req, res) => {
    try {
        const { username, bio, avatar, profileImage, oldPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) return res.status(404).json({ message: "Kullanıcı bulunamadı." });

        if (username) user.username = username.trim();
        if (bio !== undefined) user.bio = bio;
        if (avatar || profileImage) user.avatar = avatar || profileImage;

        // Şifre Değiştirme Kontrolü
        if (newPassword) {
            if (!oldPassword) {
                return res.status(400).json({ message: "Mevcut şifrenizi girmelisiniz." });
            }
            const isMatch = await bcrypt.compare(oldPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: "Eski şifreniz hatalı! ❌" });
            }
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
        }

        await user.save();
        res.status(200).json({ message: "Profil güncellendi! ✅", user });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: "Bu kullanıcı adı zaten kullanımda." });
        }
        res.status(500).json({ message: "Güncelleme hatası oluştu.", error: err.message });
    }
});

// E. KULLANICININ KENDİ HESABINI SİLMESİ (KVKK)
router.delete("/profile/me", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) return res.status(404).json({ message: "Kullanıcı bulunamadı." });

        await Promise.all([
            SavedItem.deleteMany({ username: user.username }),
            Comment.deleteMany({ username: user.username }),
            User.findByIdAndDelete(userId)
        ]);

        res.status(200).json({ message: "Hesabınız ve tüm verileriniz başarıyla silindi." });
    } catch (error) {
        res.status(500).json({ message: "Hesap silinirken hata oluştu.", error: error.message });
    }
});

// ======================================================
// 2. KÜTÜPHANE / KAYIT İŞLEMLERİ (SAVE / UNSAVE)
// ======================================================

// KAYDET / KALDIR (TOGGLE)
router.post("/save", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "Kullanıcı bulunamadı." });

        const { itemId, title, type, url } = req.body;
        if (!itemId) return res.status(400).json({ message: "İçerik ID'si zorunludur." });

        const existing = await SavedItem.findOne({ username: user.username, itemId: String(itemId) });

        if (existing) {
            await SavedItem.findByIdAndDelete(existing._id);
            return res.status(200).json({ message: "Kütüphaneden çıkarıldı.", status: "removed" });
        } else {
            const newItem = new SavedItem({
                userId: user._id,
                username: user.username,
                itemId: String(itemId),
                title: title || "Kayıtlı İçerik",
                type: type || "blog",
                url: url || "",
                createdAt: new Date()
            });
            await newItem.save();
            return res.status(201).json({ message: "Kütüphaneye eklendi!", status: "added" });
        }
    } catch (error) {
        res.status(500).json({ message: "Kaydetme işlemi başarısız.", error: error.message });
    }
});

// KAYITLI İÇERİĞİ SİL (Tekli Silme)
router.delete("/save/:dbId", authMiddleware, async (req, res) => {
    try {
        const docId = req.params.dbId;

        await Promise.all([
            SavedItem.findByIdAndDelete(docId),
            User.findByIdAndUpdate(req.user.id, { $pull: { savedItems: { _id: docId } } })
        ]);

        res.status(200).json({ message: "Başarıyla silindi." });
    } catch (error) {
        res.status(500).json({ message: "Silinirken hata oluştu.", error: error.message });
    }
});

// ======================================================
// 3. ADMİN: KULLANICIYI VE VERİLERİNİ TEMİZLE
// ======================================================
router.delete("/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const targetUserId = req.params.id;
        const user = await User.findById(targetUserId);

        if (!user) return res.status(404).json({ message: "Silinecek kullanıcı bulunamadı." });

        await Promise.all([
            SavedItem.deleteMany({ username: user.username }),
            Comment.deleteMany({ username: user.username }),
            User.findByIdAndDelete(targetUserId)
        ]);

        res.status(200).json({ message: `${user.username} hesabı ve tüm verileri silindi.` });
    } catch (error) {
        res.status(500).json({ message: "Kullanıcı silinemedi.", error: error.message });
    }
});

// ======================================================
// 4. GENEL KULLANICI PROFİLİ GÖRÜNTÜLEME
// (DİKKAT: Diğer tüm alt yolları ezmemesi için EN ALTA konulur)
// ======================================================
router.get("/:username", async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username }).select("-password");
        if (!user) {
            return res.status(404).json({ message: "Kullanıcı bulunamadı." });
        }
        res.status(200).json(user);
    } catch (err) {
        res.status(500).json({ message: "Sunucu hatası", error: err.message });
    }
});

module.exports = router;