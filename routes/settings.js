const router = require("express").Router();
const Settings = require("../models/Settings"); // Dosya adı: Settings.js

// 1. AYARLARI GETİR
router.get("/", async (req, res) => {
    try {
        let settings = await Settings.findOne();

        // Eğer ayar yoksa varsayılanları oluştur
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
        res.status(500).json(err);
    }
});

// ======================================================
// 2. AYARLARI GÜNCELLE
// ======================================================
router.put("/", async (req, res) => {
    try {
        console.log("📥 Admin Panelinden Gelen Veri:", JSON.stringify(req.body, null, 2));

        const updatedSettings = await Settings.findOneAndUpdate(
            {},
            { $set: req.body },
            { new: true, upsert: true }
        );

        console.log("✅ Veritabanı Güncellendi!");
        res.status(200).json({ message: "Ayarlar güncellendi!", settings: updatedSettings });
    } catch (err) {
        console.error("PUT Hatası:", err);
        res.status(500).json(err);
    }
});

// ======================================================
// 3. KİTABI BİTİR
// ======================================================
router.post("/finish-book", async (req, res) => {
    try {
        const settings = await Settings.findOne();
        if (settings) {
            settings.goal.current += 1;
            settings.currentBook = {
                title: "Yeni Kitap Seç",
                author: "-",
                cover: "https://placehold.co/150?text=Kitap",
                totalPage: 100,
                currentPage: 0,
                percent: 0
            };
            await settings.save();
            res.status(200).json(settings);
        }
    } catch (err) {
        res.status(500).json(err);
    }
});

// ======================================================
// 4. SÖZ HAVUZUNA YENİ SÖZ EKLE (POST /api/settings/quote)
// ======================================================
router.post("/quote", async (req, res) => {
    try {
        const { text, author } = req.body;
        if (!text) return res.status(400).json({ message: "Söz metni boş olamaz!" });

        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings();
        }

        if (!settings.quotes) {
            settings.quotes = [];
        }

        // Yeni eklenen sözü listenin en başına koy
        settings.quotes.unshift({
            text: text.trim(),
            author: (author && author.trim()) ? author.trim() : "Anonim"
        });

        await settings.save();
        res.status(200).json({ message: "Söz eklendi! ✨", quotes: settings.quotes });
    } catch (err) {
        console.error("Söz Ekleme Hatası:", err);
        res.status(500).json({ message: "Sunucu hatası oluştu." });
    }
});

// ======================================================
// 5. SÖZ HAVUZUNDAN SÖZ SİL (DELETE /api/settings/quote/:index)
// ======================================================
router.delete("/quote/:index", async (req, res) => {
    try {
        const index = parseInt(req.params.index);
        let settings = await Settings.findOne();

        if (!settings || !settings.quotes || index < 0 || index >= settings.quotes.length) {
            return res.status(404).json({ message: "Söz bulunamadı!" });
        }

        settings.quotes.splice(index, 1);
        await settings.save();

        res.status(200).json({ message: "Söz silindi.", quotes: settings.quotes });
    } catch (err) {
        console.error("Söz Silme Hatası:", err);
        res.status(500).json({ message: "Sunucu hatası oluştu." });
    }
});

module.exports = router;