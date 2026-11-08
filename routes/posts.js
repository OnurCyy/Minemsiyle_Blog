const express = require("express");
const router = express.Router();
const Post = require("../models/Post");

// ==========================================
// 1. TÜM YAZILARI GETİR (En Yeni En Üstte)
// ==========================================
router.get("/", async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 });
        res.status(200).json(posts);
    } catch (err) {
        res.status(500).json({ message: "Yazılar getirilemedi.", error: err.message });
    }
});

// ==========================================
// 2. TEK BİR YAZIYI GETİR (Seri Radarı Destekli)
// ==========================================
router.get("/:id", async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "Yazı bulunamadı." });

        const postData = post.toObject();

        // 🕵️‍♂️ Seri Radarı (Önceki ve Sonraki Bölüm Tespiti)
        if (postData.seriesName && postData.seriesOrder > 0) {
            const [prevPost, nextPost] = await Promise.all([
                Post.findOne(
                    { seriesName: postData.seriesName, seriesOrder: postData.seriesOrder - 1 },
                    "_id title"
                ).lean(),
                Post.findOne(
                    { seriesName: postData.seriesName, seriesOrder: postData.seriesOrder + 1 },
                    "_id title"
                ).lean()
            ]);

            postData.prevPost = prevPost;
            postData.nextPost = nextPost;
        }

        res.status(200).json(postData);
    } catch (err) {
        res.status(500).json({ message: "Yazı getirilemedi.", error: err.message });
    }
});

// ==========================================
// 3. YAZI EKLE
// ==========================================
router.post("/", async (req, res) => {
    try {
        const { title, content, image, category, seriesName, seriesOrder, author } = req.body;

        if (!title || !content) {
            return res.status(400).json({ message: "Başlık ve içerik alanları zorunludur." });
        }

        const newPost = new Post({
            title,
            content,
            image,
            category: category || "Genel",
            seriesName: seriesName || "",
            seriesOrder: Number(seriesOrder) || 0,
            author: author || req.user?.username || "Anonim"
        });

        const savedPost = await newPost.save();
        res.status(201).json(savedPost);
    } catch (err) {
        res.status(500).json({ message: "Yazı kaydedilemedi.", error: err.message });
    }
});

// ==========================================
// 4. YAZI GÜNCELLE
// ==========================================
router.put("/:id", async (req, res) => {
    try {
        const { title, content, image, category, seriesName, seriesOrder } = req.body;

        const updatedPost = await Post.findByIdAndUpdate(
            req.params.id,
            {
                ...(title && { title }),
                ...(content && { content }),
                ...(image !== undefined && { image }),
                ...(category && { category }),
                ...(seriesName !== undefined && { seriesName }),
                ...(seriesOrder !== undefined && { seriesOrder: Number(seriesOrder) })
            },
            { new: true }
        );

        if (!updatedPost) return res.status(404).json({ message: "Düzenlenecek yazı bulunamadı." });

        res.json({ message: "Yazı başarıyla güncellendi!", post: updatedPost });
    } catch (err) {
        res.status(500).json({ message: "Güncelleme sırasında hata oluştu.", error: err.message });
    }
});

// ==========================================
// 5. YAZI SİL (Tek Hamlede Güvenli Silme)
// ==========================================
router.delete("/:id", async (req, res) => {
    try {
        const deletedPost = await Post.findByIdAndDelete(req.params.id);

        if (!deletedPost) {
            return res.status(404).json({ message: "Silinecek yazı bulunamadı." });
        }

        res.status(200).json({ message: "Yazı başarıyla silindi." });
    } catch (err) {
        res.status(500).json({ message: "Silme işlemi başarısız.", error: err.message });
    }
});

// ==========================================
// 6. BEĞENİ AÇ / KAPA (LIKE / UNLIKE)
// ==========================================
router.post("/:id/like", async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) return res.status(400).json({ message: "Kullanıcı adı zorunludur." });

        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "Yazı bulunamadı." });

        let currentLikes = Array.isArray(post.likes) ? post.likes : [];
        currentLikes = currentLikes.filter(u => u && String(u).trim() !== "" && u !== "0");

        const hasLiked = currentLikes.includes(username);

        if (hasLiked) {
            currentLikes = currentLikes.filter(user => user !== username);
        } else {
            currentLikes.push(username);
        }

        await Post.findByIdAndUpdate(
            req.params.id,
            { $set: { likes: currentLikes } },
            { new: true }
        );

        res.json({
            message: hasLiked ? "Beğeni geri alındı." : "Yazı beğenildi.",
            likesCount: currentLikes.length,
            hasLiked: !hasLiked
        });
    } catch (err) {
        res.status(500).json({ message: "Beğeni işlemi başarısız.", error: err.message });
    }
});

// ==========================================
// 7. GÖRÜNTÜLENME SAYACI (+1)
// ==========================================
router.post("/:id/view", async (req, res) => {
    try {
        const item = await Post.findByIdAndUpdate(
            req.params.id,
            { $inc: { views: 1 } },
            { new: true }
        );

        if (!item) return res.status(404).json({ message: "Yazı bulunamadı." });

        res.json({ views: item.views });
    } catch (err) {
        res.status(500).json({ message: "Sayaç artırılamadı.", error: err.message });
    }
});

module.exports = router;