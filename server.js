const express = require("express");
const dotenv = require("dotenv");
dotenv.config(); // Ortam değişkenlerini en başta yükle

const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const session = require("express-session");
const passport = require("passport");
const path = require("path");
const { Resend } = require("resend");
const compression = require("compression");

// --- GÜVENLİK MODÜLLERİ ---
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");

// --- PASSPORT STRATEJİLERİ ---
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const DiscordStrategy = require("passport-discord").Strategy;
const TwitterStrategy = require("passport-twitter").Strategy;

// --- MODELLER ---
const User = require("./models/User");
const SavedItem = require("./models/SavedItem");
const Comment = require("./models/Comment");

// --- ROTA IMPORTLARI ---
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const adminRoutes = require("./routes/admin");
const settingsRoute = require("./routes/settings");
const bookRoute = require("./routes/books");
const postRoute = require("./routes/posts");
const dashboardRoute = require("./routes/dashboard");
const commentRoute = require("./routes/comments");

// Dosya adın 'miantenanceMiddleware.js' ise bu satırı bozma
const maintenanceMiddleware = require("./middleware/miantenanceMiddleware");

const app = express();

// ==========================================
// 🛡️ ALTYAPI & PERFORMANS AYARLARI
// ==========================================

// Express reverse proxy desteği (Render / Cloudflare için zorunludur)
app.set("trust proxy", 1);

// Altyapı bilgisini gizle
app.disable("x-powered-by");

// Brotli & Gzip sıkıştırma
app.use(compression({ threshold: 1024 }));

// Helmet HTTP Güvenlik Başlıkları
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// Donanım izinleri kısıtlama başlığı
app.use((req, res, next) => {
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
    next();
});

// CORS Yapılandırması
const allowedOrigins = [
    "https://minemsiyle.com",
    "https://www.minemsiyle.com",
    "http://localhost:5000",
    "http://127.0.0.1:5500"
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("CORS Güvenlik Engeli: Bu adresten istek atamazsınız!"));
        }
    },
    credentials: true
}));

// Body Parser & NoSQL Injection Koruması
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ limit: "5mb", extended: true }));

app.use((req, res, next) => {
    mongoSanitize.sanitize(req.body);
    mongoSanitize.sanitize(req.params);
    next();
});

// Rate Limiting (Kaba Kuvvet & Bot Koruması)
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Çok fazla istek gönderildi, lütfen biraz bekleyin." }
});
app.use("/api/", globalLimiter);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Çok fazla deneme yaptınız. Lütfen 15 dakika sonra tekrar deneyin." }
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/send-reset-code", authLimiter);

// Statik Dosyalar ve Bakım Modu
app.use(maintenanceMiddleware);
app.use(express.static(path.join(__dirname, "public")));

// Oturum Yönetimi
app.use(session({
    secret: process.env.SESSION_SECRET || "gizlisifre",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// ==========================================
// 🔑 PASSPORT OAUTH STRATEJİLERİ
// ==========================================
const BASE_URL = process.env.BASE_URL || "https://minemsiyle.com";

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${BASE_URL}/api/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
            user = await User.findOne({ email: profile.emails[0].value });
            if (user) {
                user.googleId = profile.id;
                if (!user.avatar || user.avatar === "default_avatar.png") user.avatar = profile.photos[0].value;
                await user.save();
            } else {
                const newUsername = profile.displayName.replace(/\s+/g, "").toLowerCase() + Math.floor(Math.random() * 1000);
                user = new User({
                    username: newUsername,
                    email: profile.emails[0].value,
                    googleId: profile.id,
                    password: "google_" + profile.id,
                    avatar: profile.photos[0].value
                });
                await user.save();
            }
        }
        return done(null, user);
    } catch (err) { return done(err, null); }
}));

passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: `${BASE_URL}/api/auth/discord/callback`,
    scope: ["identify", "email"]
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ discordId: profile.id });
        if (!user) {
            user = await User.findOne({ email: profile.email });
            const discordAvatar = profile.avatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png` : "default_avatar.png";
            if (user) {
                user.discordId = profile.id;
                if (!user.avatar || user.avatar === "default_avatar.png") user.avatar = discordAvatar;
                await user.save();
            } else {
                const newUsername = profile.username.replace(/\s+/g, "").toLowerCase() + Math.floor(Math.random() * 1000);
                user = new User({
                    username: newUsername,
                    email: profile.email,
                    discordId: profile.id,
                    password: "discord_" + profile.id,
                    avatar: discordAvatar
                });
                await user.save();
            }
        }
        return done(null, user);
    } catch (err) { return done(err, null); }
}));

passport.use(new TwitterStrategy({
    consumerKey: process.env.TWITTER_CLIENT_ID,
    consumerSecret: process.env.TWITTER_CLIENT_SECRET,
    callbackURL: `${BASE_URL}/api/auth/twitter/callback`,
    includeEmail: true
}, async (token, tokenSecret, profile, done) => {
    try {
        let user = await User.findOne({ twitterId: profile.id });
        if (!user) {
            const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
            if (email) user = await User.findOne({ email });
            const twitterAvatar = profile.photos && profile.photos.length > 0 ? profile.photos[0].value.replace("_normal", "") : "default_avatar.png";
            if (user) {
                user.twitterId = profile.id;
                if (!user.avatar || user.avatar === "default_avatar.png") user.avatar = twitterAvatar;
                await user.save();
            } else {
                const newUsername = profile.username.toLowerCase() + Math.floor(Math.random() * 1000);
                user = new User({
                    username: newUsername,
                    email: email || `twitter_${profile.id}@no-email.com`,
                    twitterId: profile.id,
                    password: "twitter_" + profile.id,
                    avatar: twitterAvatar
                });
                await user.save();
            }
        }
        return done(null, user);
    } catch (err) { return done(err, null); }
}));

// ==========================================
// 🔒 JWT DOĞRULAMA ORTAK MIDDLEWARE
// ==========================================
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: "Yetkisiz erişim: Token bulunamadı." });
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").replace(/"/g, "").trim();
    const primaryKey = String(process.env.JWT_SECRET || "gizlisifre");
    const fallbackKey = String(process.env.SESSION_SECRET || "gizlisifre");

    jwt.verify(token, primaryKey, (err, user) => {
        if (err) {
            return jwt.verify(token, fallbackKey, (err2, user2) => {
                if (err2) {
                    return res.status(403).json({ error: "Token geçersiz veya süresi dolmuş." });
                }
                req.user = user2;
                next();
            });
        }
        req.user = user;
        next();
    });
};

// ==========================================
// 📌 DOĞRUDAN API İŞLEMLERİ (Kayıtlı İçerikler)
// ==========================================
app.post("/api/save-item", authenticateJWT, async (req, res) => {
    try {
        const { itemId, title, type } = req.body;
        const username = req.user?.username;
        const userId = req.user?.id || req.user?.userId || req.user?._id;

        if (!username) return res.status(400).json({ error: "Kullanıcı adı bulunamadı." });
        if (!itemId) return res.status(400).json({ error: "İçerik ID'si zorunludur." });

        const existing = await SavedItem.findOne({ username, itemId: String(itemId) });

        if (existing) {
            await SavedItem.findByIdAndDelete(existing._id);
            return res.status(200).json({ status: "removed", message: "Kütüphaneden kaldırıldı." });
        } else {
            const newItem = new SavedItem({
                userId: userId || undefined,
                username,
                itemId: String(itemId),
                title: title || "Kayıtlı İçerik",
                type: type || "blog",
                createdAt: new Date()
            });

            await newItem.save();
            return res.status(201).json({ status: "saved", message: "Kütüphaneye eklendi." });
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

app.delete("/api/remove-saved-item/:dbId", authenticateJWT, async (req, res) => {
    try {
        await SavedItem.findOneAndDelete({ _id: req.params.dbId, username: req.user.username });
        res.status(200).json({ message: "Başarıyla silindi." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// 📬 E-POSTA ŞİFRE SIFIRLAMA (RESEND)
// ==========================================
const resend = new Resend(process.env.RESEND_API_KEY);

app.post("/api/auth/send-reset-code", async (req, res) => {
    const email = req.body.email ? req.body.email.toLowerCase().trim() : null;
    if (!email) return res.status(400).json({ message: "E-posta adresi gerekli." });

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "Bu e-posta ile kayıtlı kullanıcı yok." });

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetCode = code;
        await user.save();

        const { error } = await resend.emails.send({
            from: "Minemsiyle <bilgi@minemsiyle.com>",
            to: email,
            subject: "🗝️ Kütüphaneye Giriş Anahtarın",
            html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #18181b; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <div style="background-color: #202024; padding: 30px; text-align: center; border-bottom: 2px solid #d4a373;">
                    <h1 style="color: #d4a373; margin: 0; font-size: 24px;">MÜMİNE'MSİ KÜTÜPHANESİ</h1>
                    <p style="color: #a1a1aa; font-size: 14px; margin-top: 5px;">Şifre Sıfırlama Talebi</p>
                </div>
                <div style="padding: 40px 30px; text-align: center;">
                    <h2 style="color: #e4e4e7; font-size: 20px; margin-bottom: 20px;">Merhaba ${user.username},</h2>
                    <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                        Kütüphane kapılarının kilidini açmak için yeni bir anahtar talep ettin. Aşağıdaki tek kullanımlık güvenlik kodunu kullanarak şifreni yenileyebilirsin.
                    </p>
                    <div style="background-color: #27272a; border: 1px dashed #d4a373; border-radius: 10px; padding: 20px; display: inline-block; margin-bottom: 30px;">
                        <span style="font-size: 32px; font-weight: bold; color: #d4a373; letter-spacing: 5px;">${code}</span>
                    </div>
                    <p style="color: #71717a; font-size: 13px; margin-top: 10px;">
                        Bu işlemi sen yapmadıysan, bu e-postayı görmezden gelebilirsin.
                    </p>
                </div>
            </div>
            `
        });

        if (error) {
            console.error("Resend Hatası:", error);
            return res.status(500).json({ message: "Mail servisi reddetti." });
        }

        res.status(200).json({ message: "Doğrulama kodu gönderildi! 📩 Lütfen mailini kontrol et." });
    } catch (error) {
        console.error("Mail Hatası:", error);
        res.status(500).json({ message: "Sunucu hatası: Mail gönderilemedi." });
    }
});

app.post("/api/auth/verify-reset-code", async (req, res) => {
    const email = req.body.email ? req.body.email.toLowerCase().trim() : null;
    const { code, newPassword } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user || user.resetCode !== code) {
            return res.status(400).json({ message: "Hatalı Kod veya E-posta!" });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.resetCode = null;
        await user.save();

        res.status(200).json({ message: "Şifreniz başarıyla yenilendi! 🎉" });
    } catch (error) {
        res.status(500).json({ message: "Şifre güncellenirken hata oluştu." });
    }
});

// ==========================================
// 🌐 GENEL BİLGİ VE HERKESE AÇIK VERİLER
// ==========================================
app.get("/api/public-user", async (req, res) => {
    try {
        const target = req.query.u;
        if (!target) return res.status(400).json({ error: "Kullanıcı adı eksik" });

        const user = await User.findOne({
            username: { $regex: new RegExp("^" + target + "$", "i") }
        }).select("-password");

        if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı" });
        res.json(user);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get("/api/public-saved", async (req, res) => {
    try {
        const targetUser = req.query.u;
        if (!targetUser) return res.status(400).json({ error: "Kullanıcı belirtilmedi." });

        const savedItems = await SavedItem.find({
            username: { $regex: new RegExp("^" + targetUser + "$", "i") }
        }).sort({ createdAt: -1 });

        res.json({ savedItems });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get("/api/public-comments", async (req, res) => {
    try {
        const targetUser = req.query.u;
        if (!targetUser) return res.status(400).json({ error: "Kullanıcı belirtilmedi." });

        const comments = await Comment.find({
            username: { $regex: new RegExp("^" + targetUser + "$", "i") }
        }).sort({ date: -1, createdAt: -1 });

        res.json({ comments });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// 🔀 ANA ROTA MODÜLLERİ
// ==========================================
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/books", bookRoute);
app.use("/api/posts", postRoute);
app.use("/api/settings", settingsRoute);
app.use("/api/dashboard", dashboardRoute);
app.use("/api/comments", commentRoute);

// OAuth Callbacks
const JWT_FALLBACK = "gizlisifre";

app.get("/api/auth/google", passport.authenticate("google", { scope: ["profile", "email"], prompt: "select_account" }));
app.get("/api/auth/google/callback", passport.authenticate("google", { failureRedirect: "/login.html" }), (req, res) => {
    const token = jwt.sign({ id: req.user._id, username: req.user.username }, process.env.JWT_SECRET || JWT_FALLBACK, { expiresIn: "7d" });
    res.redirect(`/login.html?token=${token}`);
});

app.get("/api/auth/discord", passport.authenticate("discord"));
app.get("/api/auth/discord/callback", passport.authenticate("discord", { failureRedirect: "/login.html" }), (req, res) => {
    const token = jwt.sign({ id: req.user._id, username: req.user.username }, process.env.JWT_SECRET || JWT_FALLBACK, { expiresIn: "7d" });
    res.redirect(`/login.html?token=${token}`);
});

app.get("/api/auth/twitter", passport.authenticate("twitter"));
app.get("/api/auth/twitter/callback", passport.authenticate("twitter", { failureRedirect: "/login.html" }), (req, res) => {
    const token = jwt.sign({ id: req.user._id, username: req.user.username }, process.env.JWT_SECRET || JWT_FALLBACK, { expiresIn: "7d" });
    res.redirect(`/login.html?token=${token}`);
});

// ==========================================
// 📄 SAYFA YÖNLENDİRMELERİ
// ==========================================
app.get("/kitap/:slug", (req, res) => res.sendFile(path.join(__dirname, "public/book.html")));
app.get("/blog/:slug", (req, res) => res.sendFile(path.join(__dirname, "public/post.html")));
app.get("/kvkk", (req, res) => res.sendFile(path.join(__dirname, "public/kvkk.html")));
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public/index.html")));

app.get("/:username", (req, res, next) => {
    if (req.path.includes(".") || req.params.username.startsWith("api")) return next();
    res.sendFile(path.join(__dirname, "public/profile.html"));
});

// ==========================================
// 🚀 VERİTABANI & SUNUCU BAŞLATMA
// ==========================================
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB Bağlandı ✅");
        app.listen(PORT, () => {
            console.log(`Sunucu ${PORT} portunda çalışıyor 🦅`);
        });
    })
    .catch((err) => console.error("MongoDB Bağlantı Hatası:", err));