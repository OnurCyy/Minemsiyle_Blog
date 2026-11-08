const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// =====================================================
// 1. KAYIT OL (REGISTER)
// =====================================================
router.post("/register", async (req, res) => {
    try {
        const email = req.body.email ? req.body.email.toLowerCase().trim() : null;
        const username = req.body.username ? req.body.username.trim() : null;
        const password = req.body.password;

        if (!username || !email || !password) {
            return res.status(400).json({ message: "Kullanıcı adı, e-posta ve şifre zorunludur." });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Şifre en az 6 karakter olmalıdır." });
        }

        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            const isEmailTaken = existingUser.email === email;
            return res.status(400).json({
                message: isEmailTaken ? "Bu e-posta adresi zaten kullanımda." : "Bu kullanıcı adı zaten alınmış."
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            username,
            email,
            password: hashedPassword
        });

        await newUser.save();

        res.status(201).json({
            message: "Kayıt başarılı! Giriş yapabilirsiniz."
        });
    } catch (error) {
        res.status(500).json({ message: "Sunucu hatası", error: error.message });
    }
});

// =====================================================
// 2. GİRİŞ YAP (LOGIN - Email veya Kullanıcı Adı Destekli)
// =====================================================
router.post("/login", async (req, res) => {
    try {
        const identifier = (req.body.email || req.body.username || "").toLowerCase().trim();
        const password = req.body.password;

        if (!identifier || !password) {
            return res.status(400).json({ message: "Giriş bilgileri ve şifre zorunludur." });
        }

        // Hem e-posta hem kullanıcı adı üzerinden sorgulama imkanı
        const user = await User.findOne({
            $or: [
                { email: identifier },
                { username: new RegExp(`^${identifier}$`, "i") }
            ]
        });

        if (!user) {
            return res.status(400).json({ message: "Kullanıcı bulunamadı." });
        }

        if (user.isBanned) {
            return res.status(403).json({
                message: "Hesabınız erişime kapatılmıştır! 🚫",
                reason: user.banReason || "Belirtilmedi"
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Hatalı şifre girdiniz." });
        }

        // Token oluşturma (server.js ile tam senkron fallback)
        const secretKey = String(process.env.JWT_SECRET || "gizlisifre");
        const token = jwt.sign(
            { id: user._id, role: user.role, username: user.username },
            secretKey,
            { expiresIn: "7d" }
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
            message: "Sunucu hatası",
            error: error.message
        });
    }
});

module.exports = router;