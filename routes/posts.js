const router = require("express").Router();
const Post = require("../models/Post");

// 1. TEK KİTAP GETİR (GET /:id)
router.get("/:id", async (req, res) => {
    try {
        console.log("👉 İSTEK GELDİ! Aranan ID:", req.params.id);

        // Veritabanında bu ID var mı diye bakıyoruz
        const post = await Post.findById(req.params.id);

        // Eğer BULAMAZSA
        if (!post) {
            console.log("❌ Veritabanı 'Böyle bir kayıt YOK' dedi.");
            return res.status(404).json("Kitap bulunamadı!");
        }

        // Eğer BULURSA
        console.log("✅ KİTAP BULUNDU:", post.title);
        res.status(200).json(post);

    } catch (err) {
        console.log("💥 SUNUCU HATASI:", err.message);
        res.status(500).json(err);
    }
});

// 2. TÜMÜNÜ GETİR
router.get("/", async (req, res) => {
    try {
        const posts = await Post.find();
        res.status(200).json(posts);
    } catch (err) {
        res.status(500).json(err);
    }
});

// 3. YAZI EKLE (Admin Paneli İçin)
router.post("/", async (req, res) => {
    try {
        const newPost = new Post(req.body);
        const savedPost = await newPost.save();
        res.status(200).json(savedPost);
    } catch (err) {
        res.status(500).json(err);
    }
});

// --- SİLME ROTASI (DELETE) ---
router.delete("/:id", async (req, res) => {
    try {
        // 1. Gelen ID'yi bul ve veritabanından uçur
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json("Silinecek kayıt bulunamadı!");
        }

        // 2. Silme işlemini yap
        await Post.findByIdAndDelete(req.params.id);

        res.status(200).json("Kayıt başarıyla silindi...");

    } catch (err) {
        // Hata varsa göster
        res.status(500).json(err);
    }
});

// DÜZENLEME
router.put("/:id", async (req, res) => {
    try {
        const { title, content, image, category } = req.body;
        // Sadece giriş yapmış olan OnurCy (yani admin) düzenleyebilsin


        const updatedPost = await Post.findByIdAndUpdate(
            req.params.id,
            { title, content, image, category },
            { new: true } // Güncellenmiş halini geri döndür
        );

        if (!updatedPost) return res.status(404).json({ message: "Yazı bulunamadı" });
        res.json({ message: "Yazı başarıyla güncellendi!", post: updatedPost });
    } catch (err) {
        res.status(500).json({ message: "Güncelleme sırasında hata oluştu." });
    }
});

module.exports = router;