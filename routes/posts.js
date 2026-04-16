const router = require("express").Router();
const Post = require("../models/Post");

// 🔥 TEK BİR YAZIYI GETİRME ROTASI (SERİ RADARI EKLENDİ) 🔥
router.get("/:id", async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "Yazı bulunamadı" });

        // Veritabanı objesini saf JavaScript objesine çeviriyoruz ki içine yeni şeyler ekleyebilelim
        const postData = post.toObject();

        // 🕵️‍♂️ SERİ RADARI DEVREDE
        if (postData.seriesName && postData.seriesOrder > 0) {
            // Bir önceki bölümü bul (Aynı seri adı, 1 numara eksiği)
            postData.prevPost = await Post.findOne(
                { seriesName: postData.seriesName, seriesOrder: postData.seriesOrder - 1 },
                '_id title' // Sadece ID ve Başlığını al (boşuna veriyi şişirme)
            );

            // Bir sonraki bölümü bul (Aynı seri adı, 1 numara fazlası)
            postData.nextPost = await Post.findOne(
                { seriesName: postData.seriesName, seriesOrder: postData.seriesOrder + 1 },
                '_id title'
            );
        }

        // Ön cepheye yazıyı (varsa önceki/sonraki bölüm bilgileriyle) yolla
        res.json(postData);

    } catch (err) {
        console.error("Yazı getirme hatası:", err);
        res.status(500).json({ message: "Sunucu hatası" });
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

        const { title, content, image, category, seriesName, seriesOrder, author } = req.body;


        const newPost = new Post({
            title,
            content,
            image,
            category,
            seriesName: seriesName || "",
            seriesOrder: seriesOrder || 0,
            author: author || "Anonim"
        });

        const savedPost = await newPost.save();
        res.status(201).json(savedPost);
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
        const { title, content, image, category, seriesName, seriesOrder } = req.body;

        const updatedPost = await Post.findByIdAndUpdate(
            req.params.id,
            { title, content, image, category, seriesName, seriesOrder },
            { new: true }
        );

        if (!updatedPost) return res.status(404).json({ message: "Yazı bulunamadı" });
        res.json({ message: "Yazı başarıyla güncellendi!", post: updatedPost });
    } catch (err) {
        res.status(500).json({ message: "Güncelleme sırasında hata oluştu." });
    }
});

// 🔥 BLOG BEĞENİ MOTORU (BALYOZ VERSİYONU) 🔥
router.post("/:id/like", async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) return res.status(400).json({ message: "Kullanıcı adı gerekli!" });

        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "Yazı bulunamadı" });

        // Eski verileri temizleyen sistem
        let currentLikes = Array.isArray(post.likes) ? post.likes : [];
        currentLikes = currentLikes.filter(u => u !== '0' && u !== null && String(u).trim() !== '');
        const hasLiked = currentLikes.includes(username);

        if (hasLiked) {
            currentLikes = currentLikes.filter(user => user !== username);
        } else {
            currentLikes.push(username);
        }

        // Balyoz vuruşu ile güncelliyoruz
        await Post.findByIdAndUpdate(
            req.params.id,
            { $set: { likes: currentLikes } },
            { new: true }
        );

        res.json({
            message: hasLiked ? "Beğeni geri alındı" : "Yazı beğenildi",
            likesCount: currentLikes.length,
            hasLiked: !hasLiked
        });



    } catch (err) {
        console.error("❌ BLOG BEĞENİ HATASI:", err);
        res.status(500).json({ message: "Beğeni işlemi başarısız oldu." });
    }
});

// 🔥 V4.0 GÖRÜNTÜLENME SAYACI ROTASI 🔥
router.post("/:id/view", async (req, res) => {
    try {
        // $inc komutu MongoDB'nin sihirli değneğidir. Sayıyı anında 1 artırır!
        const item = await Post.findByIdAndUpdate(
            req.params.id,
            { $inc: { views: 1 } }, // Görüntülenmeyi 1 artır
            { new: true }
        );

        if (!item) return res.status(404).json({ message: "Bulunamadı" });

        res.json({ views: item.views });
    } catch (err) {
        console.error("Görüntülenme sayacı hatası:", err);
        res.status(500).json({ message: "Sayaç artırılamadı" });
    }
});

module.exports = router;