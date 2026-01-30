const Settings = require("../models/Settings");

const maintenanceMiddleware = async (req, res, next) => {
    const settings = await Settings.findOne();

    if (!settings || !settings.maintenanceMode) {
        return next();
    }

    if (req.user && req.user.role === "admin") {
        return next();
    }

    return res.status(503).json({
        maintenance: true,
        message: "Site Bakımdadır..."
    });
};

module.exports = maintenanceMiddleware;