const express = require("express");
const jwt = require('jsonwebtoken');
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require('nodemailer');
const dotenv = require("dotenv");
const bcrypt = require('bcrypt');
const session = require("express-session");
const passport = require("passport");
const path = require('path');
const axios = require('axios');
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const DiscordStrategy = require("passport-discord").Strategy;
const TwitterStrategy = require("passport-twitter").Strategy;

// Modeller
const User = require('./models/User');
const SavedItem = require('./models/SavedItem');


// Rotalar
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const adminRoutes = require("./routes/admin");
const settingsRoute = require("./routes/settings");
const bookRoute = require("./routes/books");
const postRoute = require("./routes/posts");
const dashboardRoute = require("./routes/dashboard");
const subRoute = require("./routes/subs");
const commentRoute = require("./routes/comments");

const maintenanceMiddleware = require("./middleware/miantenanceMiddleware");

dotenv.config();
const app = express();

// Middleware Ayarları
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());
app.use(maintenanceMiddleware);
app.use(express.static("public"));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: process.env.SESSION_SECRET || 'gizli_anahtar',
    resave: false,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

//-------------------------------------------- STRATEJİLER ------------------------------------------------------------
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
                if (!user.avatar || user.avatar === 'default_avatar.png') user.avatar = profile.photos[0].value;
                await user.save();
            } else {
                const newUsername = profile.displayName.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000);
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
    scope: ['identify', 'email']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ discordId: profile.id });
        if (!user) {
            user = await User.findOne({ email: profile.email });
            const discordAvatar = profile.avatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png` : 'default_avatar.png';
            if (user) {
                user.discordId = profile.id;
                if (!user.avatar || user.avatar === 'default_avatar.png') user.avatar = discordAvatar;
                await user.save();
            } else {
                const newUsername = profile.username.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000);
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
            if (email) user = await User.findOne({ email: email });
            const twitterAvatar = profile.photos && profile.photos.length > 0 ? profile.photos[0].value.replace('_normal', '') : 'default_avatar.png';
            if (user) {
                user.twitterId = profile.id;
                if (!user.avatar || user.avatar === 'default_avatar.png') user.avatar = twitterAvatar;
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

// --- ROTALAR  -------------------------------------------
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/books", bookRoute);
app.use("/api/posts", postRoute);
app.use("/api/settings", settingsRoute);
app.use("/api/dashboard", dashboardRoute);
app.use("/api/subs", subRoute);
app.use("/api/comments", commentRoute);

app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'], prompt: 'select_account' }));
app.get('/api/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login.html' }), (req, res) => {
    const token = jwt.sign({ id: req.user._id, username: req.user.username }, process.env.SESSION_SECRET || 'gizli_anahtar', { expiresIn: '7d' });
    res.redirect(`/login.html?token=${token}`);
});

app.get('/api/auth/discord', passport.authenticate('discord'));
app.get('/api/auth/discord/callback', passport.authenticate('discord', { failureRedirect: '/login.html' }), (req, res) => {
    const token = jwt.sign({ id: req.user._id, username: req.user.username }, process.env.SESSION_SECRET || 'gizli_anahtar', { expiresIn: '7d' });
    res.redirect(`/login.html?token=${token}`);
});

app.get('/api/auth/twitter', passport.authenticate('twitter'));
app.get('/api/auth/twitter/callback', passport.authenticate('twitter', { failureRedirect: '/login.html' }), (req, res) => {
    const token = jwt.sign({ id: req.user._id, username: req.user.username }, process.env.SESSION_SECRET || 'gizli_anahtar', { expiresIn: '7d' });
    res.redirect(`/login.html?token=${token}`);
});

app.get('/kitap/:slug', (req, res) => res.sendFile(path.join(__dirname, 'public/book.html')));
app.get('/blog/:slug', (req, res) => res.sendFile(path.join(__dirname, 'public/post.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));

// --- MAİL SİSTEMİ (YENİ RESEND MOTORU) ---
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

app.post('/api/auth/send-reset-code', async (req, res) => {
    // E-postayı küçük harfe çevir ve boşlukları temizle
    const email = req.body.email ? req.body.email.toLowerCase().trim() : null;

    if (!email) return res.status(400).json({ message: "E-posta adresi gerekli." });

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "Bu e-posta ile kayıtlı kullanıcı yok." });

        // 6 Haneli Rastgele Kod Oluştur
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetCode = code;
        await user.save();

        // Şekilli Şukullu HTML Mail Şablonu - RESEND İLE GÖNDERİM
        const { data, error } = await resend.emails.send({
            from: 'Minemsiyle <bilgi@minemsiyle.com>',
            to: email,
            subject: '🗝️ Kütüphaneye Giriş Anahtarın',
            html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #18181b; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <!-- Başlık Kısmı -->
                <div style="background-color: #202024; padding: 30px; text-align: center; border-bottom: 2px solid #d4a373;">
                    <h1 style="color: #d4a373; margin: 0; font-size: 24px; letter-spacing: 1px;">MÜMİNE'MSİ KÜTÜPHANESİ</h1>
                    <p style="color: #a1a1aa; font-size: 14px; margin-top: 5px;">Şifre Sıfırlama Talebi</p>
                </div>
                
                <!-- İçerik Kısmı -->
                <div style="padding: 40px 30px; text-align: center;">
                    <h2 style="color: #e4e4e7; font-size: 20px; margin-bottom: 20px;">Merhaba ${user.username},</h2>
                    <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                        Kütüphane kapılarının kilidini açmak için yeni bir anahtar talep ettin. Aşağıdaki tek kullanımlık güvenlik kodunu kullanarak şifreni yenileyebilirsin.
                    </p>
                    
                    <!-- KOD KUTUSU -->
                    <div style="background-color: #27272a; border: 1px dashed #d4a373; border-radius: 10px; padding: 20px; display: inline-block; margin-bottom: 30px;">
                        <span style="font-size: 32px; font-weight: bold; color: #d4a373; letter-spacing: 5px;">${code}</span>
                    </div>
                    
                    <p style="color: #71717a; font-size: 13px; margin-top: 10px;">
                        Bu işlemi sen yapmadıysan, bu e-postayı görmezden gelebilirsin. Güvenliğin bizim için önemli.
                    </p>
                </div>
                
                <!-- Alt Bilgi -->
                <div style="background-color: #121214; padding: 20px; text-align: center;">
                    <p style="color: #52525b; font-size: 12px; margin: 0;">
                        © ${new Date().getFullYear()} Mümine'msi Kütüphanesi. Tüm hakları saklıdır.
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
        console.error("Mail Gönderme Hatası:", error);
        res.status(500).json({ message: "Sunucu hatası: Mail gönderilemedi." });
    }
});

app.post('/api/auth/verify-reset-code', async (req, res) => {
    // Maili küçük harfe çevir ve boşlukları sil
    const email = req.body.email ? req.body.email.toLowerCase().trim() : null;
    const { code, newPassword } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user || user.resetCode !== code) return res.status(400).json({ message: "Hatalı Kod veya E-posta!" });

        // 🛡️ Şifreyi Hashle (Güvenlik)
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        user.resetCode = null;
        await user.save();

        // Discord'a haber uçuralım (Eğer sendToDiscord fonksiyonun varsa)
        if (typeof sendToDiscord === 'function') {
            sendToDiscord('AUTH', `🔑 **${user.username}** şifresini başarıyla sıfırladı.`, user.username);
        }

        res.status(200).json({ message: "Şifren başarıyla yenilendi ve güvenli hale getirildi! 🎉" });
    } catch (error) {
        // ASIL HATAYI BURADA GÖRECEĞİZ
        console.error("Şifre Sıfırlama Kodu Onay Hatası:", error);
        res.status(500).json({ message: "Hata oluştu." });
    }
});

app.post('/api/save', async (req, res) => {
    const { username, type, itemId, title, image } = req.body;
    try {
        const existing = await SavedItem.findOne({ username, itemId });
        if (existing) {
            await SavedItem.deleteOne({ _id: existing._id });
            const count = await SavedItem.countDocuments({ itemId });
            sendToDiscord('SYSTEM', `🗑️ **${username}**, bir kitabı favorilerinden çıkardı.`, username);
            res.json({ status: 'removed', count });
        } else {
            await (new SavedItem({ username, type, itemId, title, image })).save();
            const count = await SavedItem.countDocuments({ itemId });
            sendToDiscord('LIKE', `❤️ **${username}**, kütüphanesine yeni bir kitap ekledi: **${title}**`, username);
            res.json({ status: 'saved', count });
        }
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- BAŞLATMA ---
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB Bağlandı ✅");
        app.listen(PORT, () => {
            console.log(`Sunucu ${PORT} portunda çalışıyor 🦅`);
        });
    })
    .catch((err) => console.error("MongoDB Bağlantı Hatası:", err));