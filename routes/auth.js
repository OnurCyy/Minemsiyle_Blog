const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// TEST ROTASI
router.get("/test", (req, res) => {
    res.json({ message: "Auth route çalışıyor..." });
});

// =====================================================
// 1. KAYIT OL (REGISTER)
// =====================================================
router.post("/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ message: "Tüm alanların doldurulması zorunludur" });
        }

        const existingUser = await User.findOne({
            $or: [{ email }, { username }],
        });

        if (existingUser) {
            return res.status(400).json({ message: "Kullanıcı zaten mevcut" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            username,
            email,
            password: hashedPassword,
        });

        await newUser.save();

        res.status(201).json({
            message: "Kullanıcı başarıyla oluşturuldu.",
        });
    } catch (error) {
        res.status(500).json({ message: "Sunucu Hatası" });
    }
});

// =====================================================
// 2. GİRİŞ YAP (LOGIN)
// =====================================================
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email ve şifre zorunlu" });
        }

        const user = await User.findOne({ email });

        // 1️⃣ ÖNCE user var mı?
        if (!user) {
            return res.status(400).json({ message: "Kullanıcı bulunamadı" });
        }

        // 2️⃣ SONRA banlı mı?
        if (user.isBanned) {
            return res.status(403).json({
                message: "Bu kullanıcı banlanmıştır! 🚫",
                reason: user.banReason
            });
        }

        // 3️⃣ Şifre kontrolü
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Şifre yanlış" });
        }

        // 4️⃣ Token
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET || "gizlisifre", // .env yoksa patlamasın diye
            { expiresIn: "7d" } // 1 gün az olabilir, 7 gün yapalım rahat etsinler
        );

        res.json({
            message: "Giriş başarılı",
            token,
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                avatar: user.avatar
            }
        });

    } catch (error) {
        res.status(500).json({
            message: "Sunucu Hatası",
            error: error.message
        });
    }
});

// =====================================================
// 3. ŞİFRE SIFIRLAMA (FORGOT PASSWORD) - YENİ EKLENDİ ✨
// =====================================================
router.post("/reset-password", async (req, res) => {
    try {
        const { email, newPassword } = req.body;

        if (!email || !newPassword) {
            return res.status(400).json({ message: "E-posta ve yeni şifre gerekli!" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "Bu e-posta adresiyle kayıtlı kullanıcı yok." });
        }

        // Yeni şifreyi şifrele (Hash)
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        await user.save();

        res.json({ message: "Şifren başarıyla yenilendi! Yeni şifrenle giriş yapabilirsin. 🔑" });
    } catch (error) {
        res.status(500).json({ message: "Şifre sıfırlama hatası." });
    }
});

// BU SATIR EN SONDA OLMALI!
module.exports = router;