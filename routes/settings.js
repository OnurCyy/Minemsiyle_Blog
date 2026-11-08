const express = require("express");
const router = express.Router();
const Settings = require("../models/Settings");

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

// ======================================================
// 1. AYARLARI GETİR (Herkese Açık)
// ======================================================
router.get("/", async (req, res) => {
    try {
        let settings = await Settings.findOne();

        if (!settings) {
            settings = new Settings({
                quotes: [
                    { text: "Bir kitap, içimizdeki donmuş deniz için bir balta olmalıdır.", author: "Franz Kafka" },
                    { text: "Okumak iptiladır, müptelalara selam!", author: "Cemil Meriç" }
                ],
                currentBook: { title: "Kitap Seçilmedi", author: "-", totalPage: 100, currentPage: 0 },
                goal: { target: 50, current: 0 },
                maintenance: false
            });
            await settings.save();
        }

        res.status(200).json(settings);
    } catch (err) {
        res.status(500).json({ message: "Ayarlar getirilemedi.", error: err.message });
    }
});

// ======================================================
// 2. AYARLARI GÜNCELLE (Sadece Admin)
// ======================================================
router.put("/", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const updatedSettings = await Settings.findOneAndUpdate(
            {},
            { $set: req.body },
            { new: true, upsert: true }
        );

        res.status(200).json({ message: "Ayarlar güncellendi!", settings: updatedSettings });
    } catch (err) {
        res.status(500).json({ message: "Ayarlar güncellenemedi.", error: err.message });
    }
});

// ======================================================
// 3. KİTABI BİTİR (Hedefi +1 Artır, Kitabı Sıfırla)
// ======================================================
router.post("/finish-book", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        let settings = await Settings.findOne();

        if (!settings) {
            return res.status(404).json({ message: "Ayar kaydı bulunamadı." });
        }

        if (!settings.goal) settings.goal = { target: 50, current: 0 };
        settings.goal.current = (settings.goal.current || 0) + 1;

        settings.currentBook = {
            title: "Yeni Kitap Seç",
            author: "-",
            cover: "https://placehold.co/150?text=Kitap",
            totalPage: 100,
            currentPage: 0,
            percent: 0
        };

        await settings.save();
        res.status(200).json({ message: "Tebrikler! Kitap tamamlandı.", settings });
    } catch (err) {
        res.status(500).json({ message: "İşlem başarısız.", error: err.message });
    }
});

// ======================================================
// 4. SÖZ HAVUZUNA YENİ SÖZ EKLE
// ======================================================
router.post("/quote", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { text, author } = req.body;
        if (!text || !text.trim()) {
            return res.status(400).json({ message: "Söz metni boş olamaz!" });
        }

        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings();
        }

        if (!Array.isArray(settings.quotes)) {
            settings.quotes = [];
        }

        settings.quotes.unshift({
            text: text.trim(),
            author: author && author.trim() ? author.trim() : "Anonim"
        });

        await settings.save();
        res.status(201).json({ message: "Söz eklendi! ✨", quotes: settings.quotes });
    } catch (err) {
        res.status(500).json({ message: "Söz eklenirken hata oluştu.", error: err.message });
    }
});

// ======================================================
// 5. SÖZ HAVUZUNDAN SÖZ SİL
// ======================================================
router.delete("/quote/:index", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const index = parseInt(req.params.index, 10);
        let settings = await Settings.findOne();

        if (!settings || !Array.isArray(settings.quotes) || isNaN(index) || index < 0 || index >= settings.quotes.length) {
            return res.status(404).json({ message: "Silinecek söz bulunamadı!" });
        }

        settings.quotes.splice(index, 1);
        await settings.save();

        res.status(200).json({ message: "Söz silindi.", quotes: settings.quotes });
    } catch (err) {
        res.status(500).json({ message: "Söz silinirken hata oluştu.", error: err.message });
    }
});

module.exports = router;