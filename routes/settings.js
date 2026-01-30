const router = require("express").Router();
const Settings = require("../models/Settings"); // Dosya adı: Settings.js

// 1. AYARLARI GETİR
router.get("/", async (req, res) => {
    try {
        let settings = await Settings.findOne();

        // Eğer ayar yoksa varsayılanları oluştur
        if (!settings) {
            settings = new Settings({
                // Varsayılan olarak 2 tane söz ekleyelim
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
// 2. AYARLARI GÜNCELLE (LOGLU VERSİYON 📝)
// ======================================================
router.put("/", async (req, res) => {
    try {
        // KONSOLA BAK: Buraya veri düşüyor mu?
        console.log("📥 Admin Panelinden Gelen Veri:", JSON.stringify(req.body, null, 2));

        // Tek bir kayıt olduğundan emin olmak için önce bulup güncelliyoruz
        const updatedSettings = await Settings.findOneAndUpdate(
            {},
            { $set: req.body },
            { new: true, upsert: true } // Yoksa oluştur, varsa güncelle
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

module.exports = router;