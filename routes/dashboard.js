const router = require("express").Router();
const Post = require("../models/Post");
const Book = require("../models/Book");
const User = require("../models/User");
const Comment = require("../models/Comment");

// Güvenlik kalkanları (Sadece admin paneli erişebilsin)
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

// =====================================================
// 📊 DASHBOARD GENEL İSTATİSTİKLER VE CANLI HAREKETLER
// =====================================================
router.get("/stats", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        // 1. GENEL SAYAÇLAR (Paralel sorgu ile sıfır gecikme)
        const [userCount, postCount, bookCount, commentCount] = await Promise.all([
            User.countDocuments().catch(() => 0),
            Post.countDocuments().catch(() => 0),
            Book.countDocuments().catch(() => 0),
            Comment.countDocuments().catch(() => 0)
        ]);

        // 2. TÜM SİSTEMDEN SON HAREKETLERİ ÇEK
        const [recentBooks, recentPosts, recentUsers, recentComments] = await Promise.all([
            Book.find().select("title createdAt").sort({ createdAt: -1 }).limit(4).lean(),
            Post.find().select("title createdAt").sort({ createdAt: -1 }).limit(4).lean(),
            User.find().select("username createdAt").sort({ createdAt: -1 }).limit(4).lean(),
            Comment.find().select("username text contentType createdAt date").sort({ createdAt: -1, date: -1 }).limit(4).lean()
        ]);

        const activities = [];

        // 📚 Kitap Hareketleri
        recentBooks.forEach(b => {
            activities.push({
                type: "book",
                icon: "ph-books",
                color: "var(--accent, #eab308)",
                text: `📚 Yeni Kitap Eklendi: <b>${b.title}</b>`,
                date: b.createdAt || new Date()
            });
        });

        // ✍️ Blog / Yazı Hareketleri
        recentPosts.forEach(p => {
            activities.push({
                type: "post",
                icon: "ph-pen-nib",
                color: "#10b981", // Yeşil
                text: `✍️ Yeni Blog Yazısı: <b>${p.title}</b>`,
                date: p.createdAt || new Date()
            });
        });

        // 👤 Yeni Kayıt Olan Kullanıcılar
        recentUsers.forEach(u => {
            activities.push({
                type: "user",
                icon: "ph-user-plus",
                color: "#3b82f6", // Mavi
                text: `👤 Yeni Üye Katıldı: <b>@${u.username}</b>`,
                date: u.createdAt || new Date()
            });
        });

        // 💬 Yeni Gelen Yorumlar
        recentComments.forEach(c => {
            const shortComment = c.text ? (c.text.length > 40 ? c.text.substring(0, 40) + "..." : c.text) : "";
            activities.push({
                type: "comment",
                icon: "ph-chat-circle-dots",
                color: "#ec4899", // Pembe
                text: `💬 <b>@${c.username}</b> yorum yaptı: <i>"${shortComment}"</i>`,
                date: c.createdAt || c.date || new Date()
            });
        });

        // 3. TARİHE GÖRE SIRALA (En yeni hareket en üstte) VE SON 8 HAREKETİ AL
        activities.sort((a, b) => new Date(b.date) - new Date(a.date));
        const recentActivities = activities.slice(0, 8);

        res.status(200).json({
            counts: {
                users: userCount,
                posts: postCount,
                books: bookCount,
                comments: commentCount
            },
            activities: recentActivities
        });

    } catch (err) {
        console.error("Dashboard Stats Hatası:", err);
        res.status(500).json({ message: "İstatistikler alınamadı.", error: err.message });
    }
});

module.exports = router;