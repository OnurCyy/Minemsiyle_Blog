const router = require("express").Router();
const Book = require("../models/Book");

// 1. TÜM KİTAPLARI GETİR
router.get("/", async (req, res) => {
    try {
        const books = await Book.find().sort({ createdAt: -1 }); // En yeni en üstte
        res.status(200).json(books);
    } catch (err) {
        res.status(500).json(err);
    }
});

// 2. TEK BİR KİTABI GETİR
router.get("/:id", async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json("Kitap bulunamadı");
        res.status(200).json(book);
    } catch (err) { res.status(500).json(err); }
});

// 3. KİTAP EKLE (İŞTE BURASI DEĞİŞTİ 🛠️)
router.post("/", async (req, res) => {
    try {
        const { title, author, publisher, pageCount, desc, cover, tag, year, addedBy } = req.body;

        // Yeni kitabı oluştururken ekleyeni de içine atıyoruz
        const newBook = new Book({
            title,
            author,
            publisher,
            pageCount,
            desc,
            cover,
            tag,
            year,
            addedBy: addedBy || "Anonim"
        });
        const savedBook = await newBook.save();
        res.status(200).json(savedBook);
    } catch (err) { res.status(500).json(err); }
});

// --- SİLME ROTASI (DELETE) ---
router.delete("/:id", async (req, res) => {
    try {
        // Gelen ID'ye göre kitabı bul ve sil
        const deletedBook = await Book.findByIdAndDelete(req.params.id);

        // Eğer kitap zaten yoksa veya silinemezse
        if (!deletedBook) {
            return res.status(404).json("Silinecek kitap bulunamadı (Zaten silinmiş olabilir).");
        }

        res.status(200).json("Kitap başarıyla silindi.");

    } catch (err) {
        // İşte 500 hatasını burası fırlatıyor.
        console.log("HATA DETAYI:", err); // Terminale hatayı yazdıralım ki görelim
        res.status(500).json(err);
    }
});

// 🔥 KİTAP DÜZENLEME ROTASI (V2.5) 🔥
router.put("/:id", async (req, res) => {
    try {
        // 1. Kitaplara özel verileri karşılıyoruz
        const { title, author, tag, publisher, pages, desc, cover } = req.body;

        // 2. Post değil, 'Book' modelini güncelliyoruz! (Senin model ismin Book veya Kitap olabilir)
        const updatedBook = await Book.findByIdAndUpdate(
            req.params.id,
            { title, author, tag, publisher, pages, desc, cover },
            { new: true } // Güncellenmiş halini geri döndür
        );

        if (!updatedBook) return res.status(404).json({ message: "Kitap bulunamadı" });

        res.json({ message: "Kitap başarıyla güncellendi!", book: updatedBook });

    } catch (err) {
        // 🔥 ALARM SİSTEMİ AÇIK 🔥
        console.error("❌ KİTAP GÜNCELLEME HATASI:", err);
        res.status(500).json({ message: "Güncelleme sırasında hata oluştu." });
    }
});

// 🔥 V3.1 PREMIUM BEĞENİ MOTORU (BALYOZ VERSİYONU) 🔥
router.post("/:id/like", async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) return res.status(400).json({ message: "Kullanıcı adı gerekli komutanım!" });

        // 1. Kitabı buluyoruz
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ message: "Kitap bulunamadı" });

        // Mongoose eski int veriyi okuyamayıp null döndürmüş olabilir, biz her ihtimale karşı jilet gibi bir liste oluşturuyoruz
        let currentLikes = Array.isArray(book.likes) ? book.likes : [];
        currentLikes = currentLikes.filter(u => u !== '0' && u !== null && String(u).trim() !== '');
        // 2. Bu adam zaten beğenmiş mi kontrol et
        const hasLiked = currentLikes.includes(username);

        if (hasLiked) {
            // Zaten beğenmişse, listeden çıkar
            currentLikes = currentLikes.filter(user => user !== username);
        } else {
            // Beğenmemişse, adını listeye ekle
            currentLikes.push(username);
        }

        // 🔥 KÖSTEBEĞİ EZEN BALYOZ VURUŞU 🔥
        // .save() kullanmıyoruz! Veritabanına doğrudan "likes alanını komple sil ve yerine bu listeyi koy" diyoruz.
        await Book.findByIdAndUpdate(
            req.params.id,
            { $set: { likes: currentLikes } }, // MongoDB'deki eski sayıyı acımadan ezer geçer!
            { new: true }
        );

        // 4. Ön cepheye güncel durumu raporla
        res.json({
            message: hasLiked ? "Beğeni geri alındı" : "Kitap beğenildi",
            likesCount: currentLikes.length,
            hasLiked: !hasLiked
        });

    } catch (err) {
        console.error("❌ BEĞENİ MOTORU HATASI:", err);
        res.status(500).json({ message: "Beğeni işlemi başarısız oldu." });
    }
});

// 🔥 V4.0 GÖRÜNTÜLENME SAYACI ROTASI 🔥
router.post("/:id/view", async (req, res) => {
    try {
        // $inc komutu MongoDB'nin sihirli değneğidir. Sayıyı anında 1 artırır!
        const item = await Book.findByIdAndUpdate(
            req.params.id,
            { $inc: { views: 1 } },
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