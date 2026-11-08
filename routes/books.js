const express = require("express");
const router = express.Router();
const Book = require("../models/Book");

// ==========================================
// 1. TÜM KİTAPLARI LİSTELE
// ==========================================
router.get("/", async (req, res) => {
    try {
        const books = await Book.find().sort({ createdAt: -1 });
        res.status(200).json(books);
    } catch (err) {
        res.status(500).json({ message: "Kitaplar getirilemedi", error: err.message });
    }
});

// ==========================================
// 2. TEK BİR KİTABI GETİR
// ==========================================
router.get("/:id", async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ message: "Kitap bulunamadı." });
        res.status(200).json(book);
    } catch (err) {
        res.status(500).json({ message: "Kitap getirilemedi", error: err.message });
    }
});

// ==========================================
// 3. KİTAP EKLE
// ==========================================
router.post("/", async (req, res) => {
    try {
        const { title, author, publisher, pageCount, pages, desc, cover, tag, year, addedBy } = req.body;

        if (!title || !author) {
            return res.status(400).json({ message: "Kitap adı ve yazar alanları zorunludur." });
        }

        const newBook = new Book({
            title,
            author,
            publisher,
            pageCount: pageCount || pages || 0,
            desc,
            cover,
            tag,
            year,
            addedBy: addedBy || req.user?.username || "Anonim"
        });

        const savedBook = await newBook.save();
        res.status(201).json(savedBook);
    } catch (err) {
        res.status(500).json({ message: "Kitap kaydedilemedi", error: err.message });
    }
});

// ==========================================
// 4. KİTAP DÜZENLE
// ==========================================
router.put("/:id", async (req, res) => {
    try {
        const { title, author, tag, publisher, pages, pageCount, desc, cover, year } = req.body;

        const updateData = {
            ...(title && { title }),
            ...(author && { author }),
            ...(tag && { tag }),
            ...(publisher && { publisher }),
            ...((pages || pageCount) && { pageCount: pages || pageCount }),
            ...(desc && { desc }),
            ...(cover && { cover }),
            ...(year && { year })
        };

        const updatedBook = await Book.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!updatedBook) return res.status(404).json({ message: "Düzenlenecek kitap bulunamadı." });

        res.json({ message: "Kitap başarıyla güncellendi!", book: updatedBook });
    } catch (err) {
        res.status(500).json({ message: "Güncelleme sırasında hata oluştu.", error: err.message });
    }
});

// ==========================================
// 5. KİTAP SİL
// ==========================================
router.delete("/:id", async (req, res) => {
    try {
        const deletedBook = await Book.findByIdAndDelete(req.params.id);

        if (!deletedBook) {
            return res.status(404).json({ message: "Silinecek kitap bulunamadı." });
        }

        res.status(200).json({ message: "Kitap başarıyla silindi." });
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
        if (!username) return res.status(400).json({ message: "Kullanıcı adı gereklidir." });

        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ message: "Kitap bulunamadı." });

        let currentLikes = Array.isArray(book.likes) ? book.likes : [];
        currentLikes = currentLikes.filter(u => u && String(u).trim() !== '' && u !== '0');

        const hasLiked = currentLikes.includes(username);

        if (hasLiked) {
            currentLikes = currentLikes.filter(u => u !== username);
        } else {
            currentLikes.push(username);
        }

        await Book.findByIdAndUpdate(
            req.params.id,
            { $set: { likes: currentLikes } },
            { new: true }
        );

        res.json({
            message: hasLiked ? "Beğeni geri alındı." : "Kitap beğenildi.",
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
        const item = await Book.findByIdAndUpdate(
            req.params.id,
            { $inc: { views: 1 } },
            { new: true }
        );

        if (!item) return res.status(404).json({ message: "Kitap bulunamadı." });

        res.json({ views: item.views });
    } catch (err) {
        res.status(500).json({ message: "Sayaç artırılamadı.", error: err.message });
    }
});

module.exports = router;