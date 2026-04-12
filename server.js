const express = require("express");
const jwt = require('jsonwebtoken');
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require('nodemailer');
const dotenv = require("dotenv");
const session = require("express-session");
const passport = require("passport");
const path = require('path');
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

// --- V2: SOSYAL GİRİŞ (PASSPORT) AYARLARI ---
app.use(session({
    secret: process.env.SESSION_SECRET || 'gizli_anahtar',
    resave: false,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

// Kullanıcı verisini şifreleyip çözme işlemleri
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

//-------------------------------------------- STRAJEDİLER ------------------------------------------------------------

// --- GOOGLE STRATEJİSİ ---
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback"
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            // 1. Bu Google hesabı daha önce sitemize kayıt olmuş mu?
            let user = await User.findOne({ googleId: profile.id });

            if (!user) {
                // 2. Peki bu e-posta adresiyle normal yoldan kayıt olan biri var mı?
                user = await User.findOne({ email: profile.emails[0].value });

                if (user) {
                    // Hesabı var ama Google ile girmemiş. İkisini birleştir!
                    user.googleId = profile.id;
                    if (!user.avatar || user.avatar === 'default_avatar.png') {
                        user.avatar = profile.photos[0].value; // Fotoğrafı da çekelim
                    }
                    await user.save();
                } else {
                    // 3. Sitemize İLK DEFA geliyor! Yepyeni hesap aç.
                    const newUsername = profile.displayName.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000);

                    user = new User({
                        username: newUsername,
                        email: profile.emails[0].value,
                        googleId: profile.id,
                        password: "google_" + profile.id, // Mecburi şifre alanı için rastgele bir şey
                        avatar: profile.photos[0].value
                    });
                    await user.save();
                }
            }

            return done(null, user);
        } catch (err) {
            return done(err, null);
        }
    }));


// --- DISCORD STRATEJİSİ ---
passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: "/api/auth/discord/callback",
    scope: ['identify', 'email'] // Kullanıcı adı ve e-posta istiyoruz
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            // 1. Bu Discord hesabı daha önce sitemize kayıt olmuş mu?
            let user = await User.findOne({ discordId: profile.id });

            if (!user) {
                // 2. Peki bu e-posta adresiyle normal yoldan kayıt olan var mı?
                user = await User.findOne({ email: profile.email });

                // Discord avatar URL'sini oluşturma
                const discordAvatar = profile.avatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png` : 'default_avatar.png';

                if (user) {
                    // Hesabı var ama Discord ile girmemiş. İkisini birleştir!
                    user.discordId = profile.id;
                    if (!user.avatar || user.avatar === 'default_avatar.png') {
                        user.avatar = discordAvatar;
                    }
                    await user.save();
                } else {
                    // 3. Sitemize İLK DEFA geliyor! Yepyeni hesap aç.
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
        } catch (err) {
            return done(err, null);
        }
    }));

// --- X (TWITTER) STRATEJİSİ ---
passport.use(new TwitterStrategy({
    consumerKey: process.env.TWITTER_CLIENT_ID,       // Twitter consumerKey kullanır
    consumerSecret: process.env.TWITTER_CLIENT_SECRET, // Twitter consumerSecret kullanır
    callbackURL: "/api/auth/twitter/callback",
    includeEmail: true // E-posta adresini de çekmek için
},
    async (token, tokenSecret, profile, done) => {
        try {
            let user = await User.findOne({ twitterId: profile.id });
            if (!user) {
                // E-posta ile eşleşme kontrolü (Twitter e-posta vermeyebilir, güvenlik önlemi)
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
                        email: email || `twitter_${profile.id}@no-email.com`, // Email yoksa sahte atıyoruz mecbur
                        twitterId: profile.id,
                        password: "twitter_" + profile.id,
                        avatar: twitterAvatar
                    });
                    await user.save();
                }
            }
            return done(null, user);
        } catch (err) {
            return done(err, null);
        }
    }));

// --- ROTALAR------------------------------------------- ---
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/books", bookRoute);
app.use("/api/posts", postRoute);
app.use("/api/settings", settingsRoute);
app.use("/api/dashboard", dashboardRoute);
app.use("/api/subs", subRoute);
app.use("/api/comments", commentRoute);
// Kullanıcı Google butonuna basınca gideceği yer
app.get('/api/auth/google',
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        prompt: 'select_account'
    })
);
// Google'ın kullanıcıyı geri göndereceği yer
app.get('/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login.html' }),
    (req, res) => {
        // req.user içinde artık MongoDB'den gelen kullanıcımız var!

        // Sana bir giriş bileti (Token) kesiyoruz
        const token = jwt.sign(
            { id: req.user._id, username: req.user.username },
            process.env.SESSION_SECRET || 'gizli_anahtar',
            { expiresIn: '7d' }
        );

        // Kullanıcıyı token ile birlikte ana sayfaya yolla!
        res.redirect(`/login.html?token=${token}`);
    }
);

// Kullanıcı Discord butonuna basınca gideceği yer
app.get('/api/auth/discord',
    passport.authenticate('discord')
);

//Discord'un kullanıcıyı geri göndereceği yer (Google ile aynı yönlendirme)
app.get('/api/auth/discord/callback',
    passport.authenticate('discord', { failureRedirect: '/login.html' }),
    (req, res) => {
        // Token oluştur
        const token = jwt.sign(
            { id: req.user._id, username: req.user.username },
            process.env.SESSION_SECRET || 'gizli_anahtar',
            { expiresIn: '7d' }
        );

        // Kullanıcıyı token ile frontend'e yolla 
        res.redirect(`/login.html?token=${token}`);
    }
);

// --- TWITTER ROTALARI ---
app.get('/api/auth/twitter', passport.authenticate('twitter'));

app.get('/api/auth/twitter/callback',
    passport.authenticate('twitter', { failureRedirect: '/login.html' }),
    (req, res) => {
        const token = jwt.sign(
            { id: req.user._id, username: req.user.username },
            process.env.SESSION_SECRET || 'gizli_anahtar',
            { expiresIn: '7d' }
        );
        res.redirect(`/login.html?token=${token}`);
    }
);


app.get('/kitap/:slug', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/book.html'));
});

app.get('/blog/:slug', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/post.html'));
});

// Ana sayfa için
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});
// ==================================================
//  MAİL VE DİĞER FONKSİYONLAR 
// ==================================================

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
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
            from: '"Mümine\'msi Kütüphanesi" <minemsiylebot@gmail.com>',
            to: email,
            subject: '🗝️ Kütüphaneye Giriş Anahtarın',
            // Aşağıdaki HTML'i tırnak işaretlerine (backtick ` `) dikkat ederek yapıştır:
            html: `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #171412; border: 1px solid #333; border-radius: 12px; overflow: hidden;">
                <div style="background-color: #c07d56; padding: 25px; text-align: center;">
                    <h2 style="color: #ffffff; margin: 0; font-family: Georgia, serif; font-size: 24px; letter-spacing: 1px;">Mümine'msi</h2>
                    <p style="color: #f4efe3; margin: 5px 0 0 0; font-size: 13px; font-style: italic;">Okur Dünyası</p>
                </div>
                
                <div style="padding: 35px; color: #ede6e1;">
                    <h3 style="font-size: 18px; margin-top: 0;">Merhaba Okur,</h3>
                    <p style="font-size: 15px; color: #968c86; line-height: 1.6;">
                        Kütüphane kapısında kaldığını duyduk. İçeri tekrar girebilmen ve sayfaların kokusuna kavuşabilmen için gereken sihirli anahtarın hazır.
                    </p>
                    
                    <div style="margin: 35px 0; text-align: center;">
                        <span style="display: inline-block; padding: 15px 30px; background-color: #211d1a; color: #c07d56; font-size: 32px; font-weight: bold; letter-spacing: 10px; border-radius: 8px; border: 1px dashed #c07d56; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                            ${code}
                        </span>
                    </div>
                    
                    <p style="font-size: 14px; color: #968c86; text-align: center; margin-bottom: 30px;">
                        ⏳ Bu anahtarın süresi <b style="color: #c07d56;">15 dakika</b> sonra dolacaktır.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #333; margin: 0 0 20px 0;">
                    
                    <p style="font-size: 11px; color: #666; text-align: center; line-height: 1.4;">
                        Eğer şifre sıfırlama talebinde bulunmadıysan, bu e-postayı güvenle silebilirsin.<br>Senin haberin olmadan kimse kütüphanendeki kitaplara dokunamaz.
                    </p>
                </div>
            </div>
            `
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
//  SUNUCUYU BAŞLAT (Tek Seferde)
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