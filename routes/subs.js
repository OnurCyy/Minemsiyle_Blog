const router = require("express").Router();
const Subscriber = require("../models/Subscriber");

// ABONE OLMA İŞLEMİ (POST)
router.post("/", async (req, res) => {
    try {
        // Mail boş mu kontrol et
        if (!req.body.email) return res.status(400).json("Mail adresi gerekli!");

        // Yeni aboneyi oluştur
        const newSub = new Subscriber({
            email: req.body.email
        });

        // Kaydet
        const savedSub = await newSub.save();
        res.status(200).json(savedSub);

    } catch (err) {
        // Hata kodu 11000 = Bu mail zaten kayıtlı demek
        if (err.code === 11000) {
            res.status(400).json("Bu mail adresi zaten abone! 😎");
        } else {
            res.status(500).json(err);
        }
    }
});

module.exports = router;