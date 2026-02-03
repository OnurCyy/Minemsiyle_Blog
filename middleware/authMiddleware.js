const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
    // Hem 'Authorization' hem 'token' başlığına bak (Garanti olsun)
    const authHeader = req.headers.authorization || req.headers.token;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Token yok veya format hatalı" });
    }

    const token = authHeader.split(" ")[1];

    try {
        // 🔥 KİLİT NOKTA BURASI 🔥
        // Senin auth.js dosyanla BİREBİR AYNI mantığı kullanıyoruz.
        // Sunucuda .env yoksa 'gizlisifre'ye dönecek.
        const SECRET_KEY = process.env.JWT_SECRET || "gizlisifre";

        const decoded = jwt.verify(token, SECRET_KEY);

        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ message: "Kullanıcı bulunamadı" });
        }

        if (user.isBanned) {
            return res.status(403).json({ message: "Hesabınız banlandı" });
        }

        req.user = user;
        next();

    } catch (error) {
        console.log("❌ JWT Hatası:", error.message); // Hatayı terminalde gör
        return res.status(401).json({ message: "Geçersiz token" });
    }
};

module.exports = authMiddleware;