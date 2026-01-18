const adminMiddleware = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: "Yetkisiz Erişim" });
    }

    if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin yetkisi gerekli" });
    }

    next();
};

module.exports = adminMiddleware;
