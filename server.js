const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const User = require('./models/User');
const nodemailer = require('nodemailer');
const SavedItem = require('./models/SavedItem');
const BookComment = require('./models/BookComment');
const BlogComment = require('./models/BlogComment');
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const adminRoutes = require("./routes/admin");
const settingsRoute = require("./routes/settings");
const bookRoute = require("./routes/books");
const postRoute = require("./routes/posts");
const dashboardRoute = require("./routes/dashboard");
const subRoute = require("./routes/subs");


const maintenanceMiddleware = require("./middleware/miantenanceMiddleware");

require("dotenv").config();

const app = express();

// 👇 YENİ HALİ BUNUNLA DEĞİŞTİR 👇
const bodyParser = require('body-parser'); // Eğer hata verirse bunu sil, express artık bunu içinde barındırıyor.

// Sunucunun kapasitesini artırıyoruz (50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

app.use(maintenanceMiddleware);

app.use(express.static("public"));


app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/books", bookRoute);
app.use("/api/posts", postRoute);
app.use("/api/settings", settingsRoute);
app.use("/api/dashboard", dashboardRoute);
app.use("/api/subs", subRoute);


app.get("/", (req, res) => {
    res.send("Backend çalışıyor kralım 👑");
});

const startServer = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB bağlandı");

        app.listen(5000, () => {
            console.log("Server 5000 portunda çalışıyor");
        });
    } catch (err) {
        console.error("MongoDB bağlantı hatası:", err.message);
    }
};
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: 'minemsiylebot@gmail.com',
        pass: 'hstz fzlr jahm zbir'
    }
});

// --- YARDIMCI FONKSİYON: 6 Haneli Kod Üretir ---
function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// ==================================================
// 🔐 ROTA 1: ŞİFRE SIFIRLAMA KODU GÖNDER
// ==================================================
app.post('/api/auth/send-reset-code', async (req, res) => {
    const { email } = req.body;

    try {
        // Kullanıcı var mı diye bak
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "Bu e-posta ile kayıtlı kullanıcı yok." });

        // 6 Haneli kod üret
        const code = generateCode();

        // Kodu veritabanına kaydet (Geçici olarak user objesine ekliyoruz)
        // Not: User modelinde 'resetCode' diye bir alanın olması gerekmez, MongoDB esnektir ama
        // User şeman müsaitse oraya ekler. Yoksa sadece hafızada tutmak riskli, en iyisi DB'ye yazmak.
        user.resetCode = code;
        await user.save();

        // Mail İçeriği
        const mailOptions = {
            from: '"Minemsiyle Güvenlik" <minemsiylebot@gmail.com>',
            to: email,
            subject: '🔐 Şifre Sıfırlama Kodun',
            html: `
                <div style="background:#f4f4f4; padding:20px; font-family:Arial;">
                    <div style="max-width:500px; margin:0 auto; background:#fff; padding:20px; border-radius:10px;">
                        <h2 style="color:#d4a373;">Şifreni mi Unuttun?</h2>
                        <p>Sorun yok! İşte şifreni sıfırlamak için gereken kod:</p>
                        <h1 style="background:#333; color:#fff; padding:10px; text-align:center; letter-spacing:5px; border-radius:5px;">${code}</h1>
                        <p style="font-size:12px; color:#888;">Bu kodu kimseyle paylaşma.</p>
                    </div>
                </div>
            `
        };

        // Gönder!
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: "Doğrulama kodu e-postana gönderildi! 📩" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Mail gönderilemedi." });
    }
});

// ==================================================
// 🔄 ROTA 2: ŞİFREYİ YENİLE (KOD KONTROLÜ İLE)
// ==================================================
app.post('/api/auth/verify-reset-code', async (req, res) => {
    const { email, code, newPassword } = req.body;

    try {
        const user = await User.findOne({ email });

        // Kod doğru mu?
        if (!user || user.resetCode !== code) {
            return res.status(400).json({ message: "Hatalı Kod veya E-posta!" });
        }

        // Kod doğruysa şifreyi güncelle
        user.password = newPassword;
        user.resetCode = null; // Kodu sil ki tekrar kullanılmasın
        await user.save();

        res.status(200).json({ message: "Şifren başarıyla değişti! Giriş yapabilirsin. 🎉" });

    } catch (error) {
        res.status(500).json({ message: "Hata oluştu." });
    }
});

// ==================================================
// 📩 ROTA 3: BÜLTENE ABONE OL (TAKİP ET)
// ==================================================
app.post('/api/subscribe', async (req, res) => {
    const { email } = req.body;

    try {
        // İstersen burada email'i "Subscribers" diye bir tabloya kaydedebilirsin.
        // Şimdilik sadece Admin'e bildirim gitsin:

        const mailOptions = {
            from: '"Minemsiyle Bot" <seninmailin@gmail.com>',
            to: 'minemsiylebot@gmail.com', // Admin mailin
            subject: '🔔 Yeni Bir Takipçin Var!',
            text: `Kral, ${email} adresi bültene abone oldu. Listeye eklendi!`
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: "Takip listesine alındın! Teşekkürler. ✨" });

    } catch (error) {
        res.status(500).json({ message: "Hata oluştu." });
    }
});
// ==========================================
// 👤 PROFİL AKTİVİTE SİSTEMİ (FULL)
// ==========================================

// 1. Kullanıcının Tüm Yorumlarını Getir (Kitap + Blog)
app.get('/api/profile/comments/:username', async (req, res) => {
    try {
        const { username } = req.params;

        // İki tablodan da veriyi çek
        const bookComments = await BookComment.find({ author: username });
        const blogComments = await BlogComment.find({ author: username });

        // Verileri standart bir formata getir (Birleştirme için)
        const allComments = [
            ...bookComments.map(c => ({ ...c._doc, sourceType: 'Kitap 📚' })),
            ...blogComments.map(c => ({ ...c._doc, sourceType: 'Blog ✍️' }))
        ];

        // Tarihe göre sırala (En yeni en üstte)
        allComments.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json(allComments);
    } catch (error) {
        res.status(500).json({ error: "Yorum geçmişi yüklenemedi." });
    }
});

// 2. Kaydedilenleri Getir
app.get('/api/profile/saved/:username', async (req, res) => {
    try {
        const saved = await SavedItem.find({ username: req.params.username }).sort({ date: -1 });
        res.json(saved);
    } catch (error) {
        res.status(500).json({ error: "Kaydedilenler yüklenemedi." });
    }
});

// ==========================================
// ❤️ BEĞENİ & SAYAÇ SİSTEMİ (HATA YAKALAYICI VERSİYON)
// ==========================================

app.post('/api/save', async (req, res) => {
    console.log("---------------------------------------------");
    console.log("📡 İSTEK GELDİ: /api/save");

    const { username, type, itemId, title, image } = req.body;
    console.log(`👤 Kullanıcı: ${username} | ID: ${itemId}`);

    try {
        // 1. Model Kontrolü
        if (!SavedItem) {
            throw new Error("SavedItem modeli yüklenemedi! Import hatası var.");
        }

        // 2. Veritabanında Arama Yap
        console.log("🔍 Veritabanı aranıyor...");
        const existing = await SavedItem.findOne({ username, itemId });
        console.log("🔍 Arama sonucu:", existing ? "Zaten var" : "Yok, eklenecek");

        if (existing) {
            // VARSA -> SİL
            await SavedItem.deleteOne({ _id: existing._id });
            console.log("🗑️ Kayıt silindi.");

            const count = await SavedItem.countDocuments({ itemId });
            res.json({ status: 'removed', message: 'Geri alındı', count: count });
        } else {
            // YOKSA -> EKLE
            const newItem = new SavedItem({
                username,
                type: type || 'blog',
                itemId,
                title: title || 'Başlıksız',
                image: image || ''
            });

            await newItem.save();
            console.log("💾 Yeni kayıt oluşturuldu.");

            const count = await SavedItem.countDocuments({ itemId });
            res.json({ status: 'saved', message: 'Kaydedildi', count: count });
        }

    } catch (error) {
        console.error("❌ PATLADI! Hata Detayı:", error); // Hatayı buraya yazacak
        res.status(500).json({ error: "Sunucu hatası: " + error.message });
    }
});

// ==========================================
// ❤️ BEĞENİ (LIKE) SİSTEMİ
// ==========================================

// 1. BLOG YAZISINI BEĞEN
app.put('/api/posts/:id/like', async (req, res) => {
    try {
        // $inc: { likes: 1 } -> Sayıyı 1 arttır demek
        const post = await Post.findByIdAndUpdate(
            req.params.id,
            { $inc: { likes: 1 } },
            { new: true } // Güncel halini geri döndür
        );
        res.json(post);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. KİTABI BEĞEN
app.put('/api/books/:id/like', async (req, res) => {
    try {
        const book = await Book.findByIdAndUpdate(
            req.params.id,
            { $inc: { likes: 1 } },
            { new: true }
        );
        res.json(book);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// BLOG EKLEME ROTASI
app.post('/api/posts', async (req, res) => {
    // 🕵️‍♂️ AJAN: Terminale gelen veriyi yazdır
    console.log("--------------------------------");
    console.log("📨 YENİ BLOG İSTEĞİ GELDİ!");
    console.log("📸 Resim Linki:", req.body.image); // Burası boş mu dolu mu göreceğiz
    console.log("📝 Başlık:", req.body.title);

    const { title, content, image, category, excerpt, tags, author } = req.body;

    try {
        const newPost = new Post({
            title,
            content,
            image,    // Linki buraya koyuyoruz
            category,
            excerpt,
            tags,
            author
        });

        await newPost.save();
        console.log("✅ Veritabanına başarıyla kaydedildi.");
        res.status(201).json(newPost);
    } catch (error) {
        console.error("❌ KAYIT HATASI:", error);
        res.status(500).json({ error: "Kaydedilemedi: " + error.message });
    }
});


const PORT = process.env.PORT || 5000; // Render port verirse onu kullan, vermezse 5000

app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda uçuşa geçti! 🚀`);
});

startServer();
