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
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const DiscordStrategy = require("passport-discord").Strategy;
const TwitterStrategy = require("passport-twitter").Strategy;

// Modeller
const User = require('./models/User');
const SavedItem = require('./models/SavedItem');
const Message = require('./models/Message');

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

//-- CANLI SOHBET -------------------------------------------------------
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const DISCORD_WEBHOOK_URL = 'https://discordapp.com/api/webhooks/1494733947437973575/TE-nVk3lDcDRZ3mBpTJWCaOeq8SjYNaZCvzn40GriFaU0gXufknI4Z-lJ1FmzO7B3g_R';
const forbiddenWords = ['aq', 'piç', 'oe'];

io.on('connection', async (socket) => {
    console.log('📡 Bir kullanıcı bağlandı:', socket.id);

    try {
        const lastMessages = await Message.find({ isPrivate: false }).sort({ date: 1 }).limit(50);
        socket.emit('previousMessages', lastMessages);
    } catch (err) { console.log("Eski mesajlar yüklenemedi:", err); }

    // --- 1. MESAJ SİLME (Bağımsız) ---
    socket.on('deleteMessage', async (messageId) => {
        try {
            await Message.findByIdAndDelete(messageId);
            sendToDiscord('DELETE', `⚠️ Bir mesaj sistemden silindi.`, "Moderatör/Kullanıcı");
            io.emit('messageDeleted', messageId);
        } catch (err) { console.log("Silme hatası:", err); }
    });

    // --- 2. MESAJ DÜZENLEME (Bağımsız) ---
    socket.on('editMessage', async (data) => {
        try {
            await Message.findByIdAndUpdate(data.id, { text: data.newText });
            sendToDiscord('SYSTEM', `📝 Bir mesaj düzenlendi.`, data.sender || "Kullanıcı");
            io.emit('messageEdited', { id: data.id, newText: data.newText });
        } catch (err) { console.log("Düzenleme hatası:", err); }
    });

    // --- 3. MESAJ GÖNDERME ---
    socket.on('sendMessage', async (data) => {
        const hasBadWord = forbiddenWords.some(word => data.text.toLowerCase().includes(word));

        if (hasBadWord) {
            axios.post(DISCORD_WEBHOOK_URL, {
                content: `🚨 **KÜFÜR ENGELLENDİ!**\n**Kullanıcı:** ${data.sender}\n**Yazdığı:** ||${data.text}||`
            }).catch(e => console.log("Discord log hatası"));
            socket.emit('error', { message: "⚠️ Mesajın uygunsuz içerik barındırıyor!" });
            return;
        }

        try {
            const newMessage = new Message({
                sender: data.sender,
                profilePic: data.profilePic,
                text: data.text,
                date: new Date()
            });
            const savedMessage = await newMessage.save();

            // Discord logu burada kalabilir
            axios.post(DISCORD_WEBHOOK_URL, {
                embeds: [{
                    title: "💬 Yeni Sohbet Mesajı",
                    color: 3447003,
                    fields: [
                        { name: "👤 Gönderen", value: savedMessage.sender, inline: true },
                        { name: "📝 Mesaj", value: savedMessage.text }
                    ]
                }]
            }).catch(err => console.log("Discord Hatası:", err.message));

            io.emit('receiveMessage', savedMessage);
        } catch (err) { console.log("Mesaj operasyonu başarısız:", err); }
    });

    socket.on('disconnect', () => { console.log('❌ Bir kullanıcı ayrıldı.'); });
});

//---- DISCORD'A LOG GÖNDERME -------------------------------

async function sendToDiscord(type, message, user = "Sistem") {
    const webhookURL = 'https://discordapp.com/api/webhooks/1494733947437973575/TE-nVk3lDcDRZ3mBpTJWCaOeq8SjYNaZCvzn40GriFaU0gXufknI4Z-lJ1FmzO7B3g_R';

    // Log tipine göre renk belirleyelim (Hex code)
    const colors = {
        'AUTH': 0x00ff00,    // Yeşil (Kayıt)
        'BOOK': 0x0000ff,    // Mavi (Kitap Ekleme)
        'LIKE': 0xff00ff,    // Pembe (Beğeni)
        'SYSTEM': 0xffff00   // Sarı (Genel)
    };

    const embed = {
        title: `📢 Site Aktivitesi: ${type}`,
        description: message,
        color: colors[type] || 0xcccccc,
        timestamp: new Date(),
        footer: {
            text: `İşlemi Yapan: ${user}`,
        }
    };

    try {
        await axios.post(webhookURL, {
            embeds: [embed]
        });
    } catch (error) {
        console.error('Discord Webhook hatası:', error);
    }
}

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

// --- MAİL SİSTEMİ ---
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

app.post('/api/auth/send-reset-code', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "Bu e-posta ile kayıtlı kullanıcı yok." });
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetCode = code;
        await user.save();
        await transporter.sendMail({
            from: '"Mümine\'msi Kütüphanesi" <minemsiylebot@gmail.com>',
            to: email,
            subject: '🗝️ Kütüphaneye Giriş Anahtarın',
            html: `<h3>Anahtarın: ${code}</h3>` // HTML tasarımını buraya tekrar ekleyebilirsin
        });
        res.status(200).json({ message: "Doğrulama kodu gönderildi! 📩" });
    } catch (error) { res.status(500).json({ message: "Mail gönderilemedi." }); }
});

app.post('/api/auth/verify-reset-code', async (req, res) => {
    const { email, code, newPassword } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user || user.resetCode !== code) return res.status(400).json({ message: "Hatalı Kod!" });

        // 🛡️ ŞİFREYİ HASLEYEREK KAYDET (Eksik parça burasıydı!)
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        user.resetCode = null;
        await user.save();

        // Discord'a haber uçuralım
        sendToDiscord('AUTH', `🔑 **${user.username}** şifresini başarıyla sıfırladı.`, user.username);

        res.status(200).json({ message: "Şifren başarıyla yenilendi ve güvenli hale getirildi! 🎉" });
    } catch (error) {
        console.error(error);
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
        server.listen(PORT, () => {
            console.log(`Sunucu ${PORT} portunda çalışıyor 🦅`);
        });
    })
    .catch((err) => console.error("MongoDB Bağlantı Hatası:", err));