const router = require("express").Router();
const Post = require("../models/Post");
const Book = require("../models/Book");
const User = require("../models/User"); // Eğer User modelin varsa

// DASHBOARD İSTATİSTİKLERİ
router.get("/stats", async (req, res) => {
    try {
        // 1. TOPLAM SAYILAR
        // Eğer User modelin yoksa userCount'u 1 yapabilirsin (Sadece sen varsın diye)
        const userCount = await User.countDocuments().catch(() => 1);
        const postCount = await Post.countDocuments();
        const bookCount = await Book.countDocuments();

        // 2. SON HAREKETLER (Son eklenen kitap ve bloglar)
        // En son eklenen 3 kitabı çek
        const lastBooks = await Book.find().select("title createdAt").sort({ createdAt: -1 }).limit(3);
        // En son eklenen 3 blog yazısını çek
        const lastPosts = await Post.find().select("title createdAt").sort({ createdAt: -1 }).limit(3);

        let activities = [];

        // Kitapları listeye ekle
        lastBooks.forEach(b => {
            activities.push({
                icon: "ph-books",
                color: "var(--accent)",
                text: `📚 Yeni Kitap Eklendi: <b>${b.title}</b>`,
                date: b.createdAt
            });
        });

        // Blogları listeye ekle
        lastPosts.forEach(p => {
            activities.push({
                icon: "ph-pen-nib",
                color: "#10b981", // Yeşil
                text: `✍️ Yeni Blog Yazısı: <b>${p.title}</b>`,
                date: p.createdAt
            });
        });

        // Tarihe göre sırala (En yeni en üstte) ve sadece son 5'i al
        activities.sort((a, b) => new Date(b.date) - new Date(a.date));
        const recentActivities = activities.slice(0, 5);

        res.status(200).json({
            counts: { users: userCount, posts: postCount, books: bookCount },
            activities: recentActivities
        });

    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }
});

module.exports = router;