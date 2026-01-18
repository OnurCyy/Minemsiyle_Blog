const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Token yok veya format hatalı" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 🔑 ASIL FARK BURADA
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({ message: "Kullanıcı bulunamadı" });
        }

        if (user.isBanned) {
            return res.status(403).json({
                message: "Hesabınız banlandı",
                reason: user.banReason
            });
        }

        req.user = user; // ARTIK GERÇEK USER OBJESİ
        next();

    } catch (error) {
        return res.status(401).json({ message: "Geçersiz token" });
    }
};

module.exports = authMiddleware;
