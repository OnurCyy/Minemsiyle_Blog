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
        // 👇 Eskiden burada parantez içinde tek tek seçiyorduk.
        // Artık "req.body" diyerek hepsini direkt modele atıyoruz.
        // Böylece "desc" (açıklama) arada kaynamıyor.
        const newBook = new Book(req.body);

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