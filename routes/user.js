const express = require("express");
const router = express.Router();

const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

/* =====================================================
   👤 KULLANICI PROFİLİ (TOKEN GEREKLİ)
   GET /api/user/profile
===================================================== */
router.get("/profile", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");

        if (!user) {
            return res.status(404).json({ message: "Kullanıcı bulunamadı" });
        }

        res.json({
            message: "Profil bilgileri",
            user,
        });
    } catch (error) {
        res.status(500).json({ message: "Sunucu hatası" });
    }
});

/* =====================================================
   🛡 ADMIN TEST (SADECE ADMIN)
   GET /api/user/admin-test
===================================================== */
router.get(
    "/admin-test",
    authMiddleware,
    adminMiddleware,
    (req, res) => {
        res.json({
            message: "Admin erişimi başarılı",
            adminId: req.user.id,
        });
    }
);

/* =====================================================
   🚫 KULLANICI BANLAMA (SADECE ADMIN)
   POST /api/user/ban/:id
===================================================== */
router.post(
    "/ban/:id",
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
        try {
            const user = await User.findById(req.params.id);

            if (!user) {
                return res.status(404).json({ message: "Kullanıcı bulunamadı" });
            }

            if (user.role === "admin") {
                return res.status(400).json({ message: "Admin banlanamaz" });
            }

            if (user.isBanned) {
                return res.status(400).json({ message: "Kullanıcı zaten banlı" });
            }

            user.isBanned = true;
            user.banReason = req.body.reason || "Kurallara aykırı davranış";
            user.bannedAt = new Date();

            await user.save();

            res.json({
                message: "Kullanıcı banlandı",
                userId: user._id,
                reason: user.banReason,
            });
        } catch (error) {
            res.status(500).json({ message: "Sunucu hatası" });
        }
    }
);

/* =====================================================
   ♻ KULLANICI BAN KALDIRMA (SADECE ADMIN)
   POST /api/user/unban/:id
===================================================== */
router.post(
    "/unban/:id",
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
        try {
            const user = await User.findById(req.params.id);

            if (!user) {
                return res.status(404).json({ message: "Kullanıcı bulunamadı" });
            }

            if (!user.isBanned) {
                return res.status(400).json({ message: "Kullanıcı banlı değil" });
            }

            user.isBanned = false;
            user.banReason = null;
            user.bannedAt = null;

            await user.save();

            res.json({
                message: "Kullanıcının banı kaldırıldı",
                userId: user._id,
            });
        } catch (error) {
            res.status(500).json({ message: "Sunucu hatası" });
        }
    }
);

/* =====================================================
   📋 TÜM KULLANICILAR (SADECE ADMIN)
   GET /api/user/list
===================================================== */
router.get(
    "/list",
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
        try {
            const users = await User.find().select("-password");

            res.json({
                total: users.length,
                users,
            });
        } catch (error) {
            res.status(500).json({ message: "Sunucu hatası" });
        }
    }
);

module.exports = router;
