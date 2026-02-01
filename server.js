const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require('nodemailer');
const dotenv = require("dotenv");

// Modeller
const User = require('./models/User');
const SavedItem = require('./models/SavedItem');
// ❌ BookComment ve BlogComment BURADAN SİLİNDİ (Artık Comment.js var)

// Rotalar
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const adminRoutes = require("./routes/admin");
const settingsRoute = require("./routes/settings");
const bookRoute = require("./routes/books");
const postRoute = require("./routes/posts");
const dashboardRoute = require("./routes/dashboard");
const subRoute = require("./routes/subs");
const commentRoute = require("./routes/comments"); // 🔥 YENİ YORUM ROTASI

const maintenanceMiddleware = require("./middleware/miantenanceMiddleware");

dotenv.config();

const app = express();

// Middleware Ayarları
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());
app.use(maintenanceMiddleware);
app.use(express.static("public"));

// --- ROTALARI KULLAN ---
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/books", bookRoute);
app.use("/api/posts", postRoute);
app.use("/api/settings", settingsRoute);
app.use("/api/dashboard", dashboardRoute);
app.use("/api/subs", subRoute);
app.use("/api/comments", commentRoute); // 🔥 YORUMLAR ARTIK BURADA

// Ana Sayfa Testi
app.get("/", (req, res) => {
    res.send("Backend çalışıyor kralım 👑");
});

// ==================================================
// 📧 MAİL VE DİĞER FONKSİYONLAR (Mevcut kodların)
// ==================================================

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: 'minemsiylebot@gmail.com',
        pass: 'hstz fzlr jahm zbir'
    }
});

function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Şifre Sıfırlama Kodu Gönder
app.post('/api/auth/send-reset-code', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "Bu e-posta ile kayıtlı kullanıcı yok." });

        const code = generateCode();
        user.resetCode = code;
        await user.save();

        const mailOptions = {
            from: '"Minemsiyle Güvenlik" <minemsiylebot@gmail.com>',
            to: email,
            subject: '🔐 Şifre Sıfırlama Kodun',
            html: `<h1 style="background:#333; color:#fff; padding:10px;">${code}</h1>`
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: "Doğrulama kodu gönderildi! 📩" });
    } catch (error) {
        res.status(500).json({ message: "Mail gönderilemedi." });
    }
});

// Şifre Yenileme
app.post('/api/auth/verify-reset-code', async (req, res) => {
    const { email, code, newPassword } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user || user.resetCode !== code) return res.status(400).json({ message: "Hatalı Kod!" });

        user.password = newPassword;
        user.resetCode = null;
        await user.save();
        res.status(200).json({ message: "Şifren değişti! 🎉" });
    } catch (error) {
        res.status(500).json({ message: "Hata oluştu." });
    }
});

// Bülten Aboneliği
app.post('/api/subscribe', async (req, res) => {
    const { email } = req.body;
    try {
        const mailOptions = {
            from: '"Bot" <minemsiylebot@gmail.com>',
            to: 'minemsiylebot@gmail.com',
            subject: '🔔 Yeni Takipçi',
            text: `${email} abone oldu.`
        };
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: "Listeye alındın! ✨" });
    } catch (error) {
        res.status(500).json({ message: "Hata oluştu." });
    }
});

// Kaydetme Sistemi (Save)
app.post('/api/save', async (req, res) => {
    const { username, type, itemId, title, image } = req.body;
    try {
        const existing = await SavedItem.findOne({ username, itemId });
        if (existing) {
            await SavedItem.deleteOne({ _id: existing._id });
            const count = await SavedItem.countDocuments({ itemId });
            res.json({ status: 'removed', message: 'Geri alındı', count });
        } else {
            const newItem = new SavedItem({ username, type, itemId, title, image });
            await newItem.save();
            const count = await SavedItem.countDocuments({ itemId });
            res.json({ status: 'saved', message: 'Kaydedildi', count });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Profil Kaydedilenler
app.get('/api/profile/saved/:username', async (req, res) => {
    try {
        const saved = await SavedItem.find({ username: req.params.username }).sort({ date: -1 });
        res.json(saved);
    } catch (error) {
        res.status(500).json({ error: "Hata oluştu." });
    }
});

// ==================================================
// 🚀 SUNUCUYU BAŞLAT (Tek Seferde)
// ==================================================
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB Bağlandı ✅");
        app.listen(PORT, () => {
            console.log(`Sunucu ${PORT} portunda çalışıyor 🦅`);
        });
    })
    .catch((err) => {
        console.error("MongoDB Bağlantı Hatası:", err);
    });